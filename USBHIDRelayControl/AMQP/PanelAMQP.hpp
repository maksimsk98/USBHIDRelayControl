#pragma once

#include <nlohmann/json.hpp>
#include "BaseAMQP.h"
#include "Constants.hpp"
#include "../hidapi/hidapi.h"

using json = nlohmann::json;

class PanelAMQP : public BaseAMQP
{
public:
    PanelAMQP(
        std::chrono::milliseconds interval,
        AmqpClient::Channel::ptr_t channel,
        const std::string& chromaName = "")
        : BaseAMQP(
            interval,
            std::move(channel),
            chromaName,
            kPanelCommandSet,
            kPanelCommandReqv)
    {       
        setHandlersOnMap();
    }

    void OnSoftTimerEvent() override;    
    void setRelayDevice(hid_device* dev);
    bool SendCommand(unsigned char cmd);

    std::map<std::string_view, std::function<void(const json&)>> handlers;
    std::string m_activeUser;
    bool m_powerOn;

private:
    void setHandlersOnMap();
    unsigned char GetOnCommand(int relay) const;
    unsigned char GetOffCommand(int relay) const;
    void PulseRelay(int relay);
    int GetUserRelay(const std::string& user) const;
    void updateState(const json& command);
    void ProcessCommand(const json& command);

    hid_device* m_device = nullptr;

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
};