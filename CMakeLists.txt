cmake_minimum_required(VERSION 3.16)

project(USBHIDRelayControl)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_subdirectory(3rdparty/hidapi/windows)

add_executable(USBHIDRelayControl

    USBHIDRelayControl/main.cpp
)

target_include_directories(USBHIDRelayControl

PRIVATE

    3rdparty/hidapi/hidapi
)

target_link_libraries(USBHIDRelayControl

PRIVATE

    hidapi
)