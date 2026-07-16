# USB HID Relay Control

A console application for controlling the **QFY-UR06 6-Channel USB HID Relay Board**.

The application communicates directly with the relay board using the standard USB HID protocol and does not require any vendor-specific drivers or SDK.

The relay command protocol used by this device was reverse-engineed experimentally.

## Supported Device

This project has been tested with the following relay board:

| Property | Value |
|----------|-------|
| Model | **QFY-UR06** |
| Manufacturer | Ucreatefun.com |
| Product | HIDRelay |
| Relay Channels | 6 |
| Interface | USB HID |
| Vendor ID (VID) | 0x0519 |
| Product ID (PID) | 0x2018 |
| Usage Page | 0xFF00 |
| Usage | 0x0001 |

## Features

- Control six relay channels
- Turn individual relays ON and OFF
- Turn all relays ON
- Turn all relays OFF
- Interactive command-line interface
- No vendor SDK or driver required
- Based on HIDAPI
- Reverse-engineered USB HID command protocol

## Build Requirements

- Visual Studio 2022
- C++17
- HIDAPI

## Usage

Start the application and enter one of the following commands:

```
on <1-6>      Turn ON relay
off <1-6>     Turn OFF relay
allon         Turn ON all relays
alloff        Turn OFF all relays
help          Show help
exit          Exit application
```

Examples:

```
on 4
off 4
allon
alloff
```

## Implemented Commands

| Command | Description |
|---------:|-------------|
| 0xF1 | Relay 1 ON |
| 0xF2 | Relay 2 ON |
| 0xF3 | Relay 3 ON |
| 0xF4 | Relay 4 ON |
| 0xF5 | Relay 5 ON |
| 0xF6 | Relay 6 ON |
| 0xF9 | Turn all relays ON |
| 0x01 | Relay 1 OFF |
| 0x02 | Relay 2 OFF |
| 0x03 | Relay 3 OFF |
| 0x04 | Relay 4 OFF |
| 0x05 | Relay 5 OFF |
| 0x06 | Relay 6 OFF |
| 0x09 | Turn all relays OFF |

The command set above was determined experimentally for the **QFY-UR06** USB HID relay board.

## License

MIT License
