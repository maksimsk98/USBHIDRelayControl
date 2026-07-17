cmake_minimum_required(VERSION 3.16)

add_library(hidapi STATIC
    hid.c
    hidapi_descriptor_reconstruct.c
)

target_include_directories(hidapi
PUBLIC
    ..
    ../hidapi
)

target_compile_definitions(hidapi PRIVATE HID_API_NO_EXPORT_DEFINE)

target_link_libraries(hidapi
PUBLIC
    setupapi
    hid
    cfgmgr32
)

if(MSVC)
    target_compile_options(hidapi PRIVATE /W0)
else()
    target_compile_options(hidapi PRIVATE -w)
endif()