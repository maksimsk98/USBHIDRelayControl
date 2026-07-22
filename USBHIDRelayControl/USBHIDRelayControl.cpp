#include "hidapi/hidapi.h"

#include <iostream>
#include <iomanip>
#include <string>
#include "AMQP/PanelAMQP.hpp"
#pragma comment(lib, "hidapi.lib")

constexpr unsigned short kVid = 0x0519;
constexpr unsigned short kPid = 0x2018;

enum RelayCommand : unsigned char
{
    Relay1Off = 0x01,
    Relay2Off = 0x02,
    Relay3Off = 0x03,
    Relay4Off = 0x04,
    Relay5Off = 0x05,
    Relay6Off = 0x06,

    AllOff = 0x09,

    Relay1On = 0xF1,
    Relay2On = 0xF2,
    Relay3On = 0xF3,
    Relay4On = 0xF4,
    Relay5On = 0xF5,
    Relay6On = 0xF6,

    AllOn = 0xF9
};

bool SendCommand(hid_device* dev, unsigned char cmd)
{
    unsigned char report[9] =
    {
        0x00,
        cmd,
        0,0,0,0,0,0,0
    };

    int r = hid_write(dev, report, sizeof(report));

    std::cout
        << "Sent command 0x"
        << std::uppercase
        << std::hex
        << std::setw(2)
        << std::setfill('0')
        << (int)cmd
        << std::dec
        << " -> result = "
        << r
        << std::endl;

    if (r != 9)
    {
        const wchar_t* err = hid_error(dev);

        if (err)
            std::wcout << L"HID error: " << err << std::endl;

        return false;
    }

    return true;
}

void PrintHelp()
{
    std::cout << "\n";
    std::cout << "=============================================\n";
    std::cout << " USB HID Relay Console\n";
    std::cout << "=============================================\n";
    std::cout << "\n";
    std::cout << "Available commands:\n";
    std::cout << "\n";
    std::cout << "  on <1-6>      Turn ON relay\n";
    std::cout << "  off <1-6>     Turn OFF relay\n";
    std::cout << "  allon         Turn ON all relays\n";
    std::cout << "  alloff        Turn OFF all relays\n";
    std::cout << "  help          Show this help\n";
    std::cout << "  exit          Quit program\n";
    std::cout << "\n";
    std::cout << "Examples:\n";
    std::cout << "  on 4\n";
    std::cout << "  off 4\n";
    std::cout << "  allon\n";
    std::cout << "  alloff\n";
    std::cout << "\n";
}

unsigned char GetOnCommand(int relay)
{
    switch (relay)
    {
    case 1: return Relay1On;
    case 2: return Relay2On;
    case 3: return Relay3On;
    case 4: return Relay4On;
    case 5: return Relay5On;
    case 6: return Relay6On;
    default: return 0;
    }
}

unsigned char GetOffCommand(int relay)
{
    switch (relay)
    {
    case 1: return Relay1Off;
    case 2: return Relay2Off;
    case 3: return Relay3Off;
    case 4: return Relay4Off;
    case 5: return Relay5Off;
    case 6: return Relay6Off;
    default: return 0;
    }
}

int main()
{
    hid_init();

    hid_device* dev = hid_open(kVid, kPid, nullptr);

    if (!dev)
    {
        std::cout << "Device not found." << std::endl;
        return 1;
    }

    std::cout << "Device successfully opened.\n\n";


    wchar_t text[256];

    if (hid_get_manufacturer_string(dev, text, 256) == 0)
        std::wcout << L"Manufacturer : " << text << std::endl;

    if (hid_get_product_string(dev, text, 256) == 0)
        std::wcout << L"Product      : " << text << std::endl;

    if (hid_get_serial_number_string(dev, text, 256) == 0)
        std::wcout << L"Serial       : " << text << std::endl;

    //PrintHelp();
    // All Off before the start
    SendCommand(dev, AllOff);

    std::cout << "Off All relay.\n\n";

    auto channel =
        AmqpClient::Channel::Create(
            "localhost"
        );

    auto panel =
        std::make_unique<PanelAMQP>(
            std::chrono::milliseconds(100),
            channel
        );

    panel->setRelayDevice(dev);

    panel->StartSoftTimerThread();

    std::cout
        << "Panel AMQP started\n";

    while (true)
    {
        std::this_thread::sleep_for(
            std::chrono::seconds(1));
    }

    panel->StopSoftTimerThread();

    hid_close(dev);
    hid_exit();

    return 0;
}
