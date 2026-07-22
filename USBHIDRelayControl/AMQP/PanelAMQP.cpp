#include "PanelAMQP.hpp"

#include <chrono>
#include <iomanip>
#include <iostream>
#include <thread>

using json = nlohmann::json;

///////////////////////////////////////////////////////////////////////////////////////////////////

void PanelAMQP::OnSoftTimerEvent()
{
    std::lock_guard<std::mutex> lock(m_requestMutex);

    /*
        Первый запуск таймера:
        создаём consumer
    */
    if (m_consumer_tag.empty())
    {
        try
        {
            m_consumer_tag =
                m_channel->BasicConsume(
                    m_queue_name,
                    "panel_consumer");

            std::cout
                << "Panel AMQP consumer started. Queue: "
                << m_queue_name
                << std::endl;
        }
        catch (const AmqpClient::NotFoundException& e)
        {
            // очередь ещё не создана
            std::cerr
                << "Queue not found: "
                << m_queue_name
                << std::endl;

            return;
        }
        catch (const std::exception& e)
        {
            std::cerr
                << "BasicConsume error: "
                << e.what()
                << std::endl;

            return;
        }
    }

    AmqpClient::Envelope::ptr_t envelope;

    /*
        Проверяем наличие сообщения
    */
    if (m_channel->BasicConsumeMessage(m_consumer_tag, envelope, 20))
    {
        json request =
            json::parse(
                envelope->Message()->Body());

        ProcessCommand(request);
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////

void PanelAMQP::setRelayDevice(hid_device* dev)
{
    m_device = dev;
}

///////////////////////////////////////////////////////////////////////////////////////////////////

bool PanelAMQP::SendCommand(unsigned char cmd)
{
    if (!m_device)
        return false;

    unsigned char report[9] =
    {
        0x00,
        cmd,
        0,0,0,0,0,0,0
    };

    int result =
        hid_write(
            m_device,
            report,
            sizeof(report));

    std::cout
        << "Relay command 0x"
        << std::uppercase
        << std::hex
        << std::setw(2)
        << std::setfill('0')
        << (int)cmd
        << std::dec
        << " result = "
        << result
        << std::endl;

    if (result != 9)
    {
        if (const wchar_t* err = hid_error(m_device))
            std::wcout << err << std::endl;

        return false;
    }

    return true;
}

///////////////////////////////////////////////////////////////////////////////////////////////////

unsigned char PanelAMQP::GetOnCommand(int relay) const
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

///////////////////////////////////////////////////////////////////////////////////////////////////

unsigned char PanelAMQP::GetOffCommand(int relay) const
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

///////////////////////////////////////////////////////////////////////////////////////////////////

void PanelAMQP::PulseRelay(int relay)
{
    if (relay < 1 || relay > 6)
        return;

    SendCommand(GetOnCommand(relay));

    std::this_thread::sleep_for(
        std::chrono::milliseconds(1500));

    SendCommand(GetOffCommand(relay));
}

int PanelAMQP::GetUserRelay(const std::string& user) const
{
    if (user == userAlexander)   return 1;
    if (user == userKonstantin)  return 2;
    if (user == userMaxim)       return 3;
    if (user == userVladislav)   return 4;
    if (user == userBogdan)      return 5;

    return 0;
}

void PanelAMQP::updateState(const json& command)
{
    std::string activeUser =
        command.value("activeUser", "");

    bool powerOn =
        command.value("powerOn", false);

    //
    // Пользователь изменился
    //
    if (activeUser != m_activeUser)
    {
        //
        // Полностью сбрасываем выбор пользователя
        //
        SendCommand(AllOff);

        std::this_thread::sleep_for(
            std::chrono::milliseconds(1500));

        int relay =
            GetUserRelay(activeUser);

        if (relay != 0)
            PulseRelay(relay);

        m_activeUser = activeUser;

        //
        // После AllOff питание тоже выключилось,
        // поэтому если должно быть включено —
        // включаем его повторно.
        //
        if (powerOn)
        {
            PulseRelay(6);
        }

        m_powerOn = powerOn;

        return;
    }

    //
    // Пользователь тот же.
    // Переключаем только питание.
    //
    if (powerOn != m_powerOn)
    {
        PulseRelay(6);

        m_powerOn = powerOn;
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////

void PanelAMQP::ProcessCommand(const json& command)
{
    try
    {
        if (!command.contains("activeUser") ||
            !command.contains("powerOn"))
        {
            return;
        }

        auto it = handlers.find("updateState");

        if (it != handlers.end())
        {
            it->second(command);
        }
    }
    catch (const std::exception& e)
    {
        std::cerr
            << "PanelAMQP ProcessCommand error: "
            << e.what()
            << std::endl;
    }
}
///////////////////////////////////////////////////////////////////////////////////////////////////

void PanelAMQP::setHandlersOnMap()
{
    handlers["updateState"] =
        [this](const json& j)
        {
            updateState(j);
        };
}