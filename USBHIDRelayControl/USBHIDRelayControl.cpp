#include "../3rdparty/hidapi/hidapi.h"

#include <iostream>
#include <iomanip>
#include <string>

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

    PrintHelp();

    while (true)
    {
        std::cout << "\nrelay> ";

        std::string cmd;
        std::cin >> cmd;

        if (cmd == "exit")
            break;

        if (cmd == "help")
        {
            PrintHelp();
            continue;
        }

        if (cmd == "allon")
        {
            SendCommand(dev, AllOn);
            continue;
        }

        if (cmd == "alloff")
        {
            SendCommand(dev, AllOff);
            continue;
        }

        if (cmd == "on")
        {
            int relay;
            std::cin >> relay;

            unsigned char c = GetOnCommand(relay);

            if (c == 0)
            {
                std::cout << "Relay number must be from 1 to 6." << std::endl;
                continue;
            }

            SendCommand(dev, c);
            continue;
        }

        if (cmd == "off")
        {
            int relay;
            std::cin >> relay;

            unsigned char c = GetOffCommand(relay);

            if (c == 0)
            {
                std::cout << "Relay number must be from 1 to 6." << std::endl;
                continue;
            }

            SendCommand(dev, c);
            continue;
        }

        std::cout << "Unknown command.\n";
        std::cout << "Type 'help' to see available commands.\n";
    }

    hid_close(dev);
    hid_exit();

    return 0;
}

#if 0
#include "../3rdparty/hidapi/hidapi.h"
#include <windows.h>
#include <stdio.h>


void SetRelayMask(hid_device* dev, unsigned char mask)
{
    unsigned char report[9] =
    {
        0,      // Report ID
        mask,   // состояние реле
        0,0,0,
        0,0,0,
        0
    };


    int r = hid_write(
        dev,
        report,
        sizeof(report)
    );


    printf(
        "MASK %02X -> %d\n",
        mask,
        r
    );
}



int main()
{
    hid_init();


    hid_device* dev =
        hid_open(
            0x0519,
            0x2018,
            nullptr
        );


    if (!dev)
    {
        printf("open failed\n");
        return 1;
    }


    printf("opened\n");

    unsigned char cmds[] = {
    0xF1,
    0xF2,
    0xF3,
    0xF4,
    0xF5,
    0xF6,
    };

    for (unsigned char cmd : cmds)
    {
        printf("\nCMD = %02X\n", cmd);
        SetRelayMask(dev, cmd);
        Sleep(3000);
    }

    unsigned char cmds2[] = {
    0x01,
    0x02,
    0x03,
    0x04,
    0x05,
    0x06,
    };

    for (unsigned char cmd : cmds2)
    {
        printf("\nCMD = %02X\n", cmd);
        SetRelayMask(dev, cmd);
        Sleep(3000);
    }

    SetRelayMask(dev, 0xF9);   // включились все реле
    Sleep(3000);

    SetRelayMask(dev, 0x01);   // выключить первое
    Sleep(3000);

    SetRelayMask(dev, 0x09);   // выключить все
    Sleep(3000);

    hid_close(dev);

    hid_exit();

    return 0;
}
#endif