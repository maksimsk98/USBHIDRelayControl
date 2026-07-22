# =============================================================================
# 3rdparty/CMakeLists.txt
# Static library mirroring 3rdparty.vcxproj.
# Sources collected via collect_sources_recursive from the curated vendor dirs
# (same set as the .vcxproj — no SSL rabbitmq units, etc.).
# OutDir: 3rdparty/<Platform>/<Config>/3rdparty.lib
# =============================================================================

include(utils/RecursiveSourceCollection)

set(_pe_3rdparty_sources "")

macro(_pe_3rdparty_collect dir exts)
    collect_sources_recursive("${CMAKE_CURRENT_SOURCE_DIR}/${dir}" _pe_chunk
        EXTENSIONS ${exts}
        EXCLUDE_DIRS tests test examples
        INCLUDE_EXAMPLES OFF
        INCLUDE_TESTS OFF
    )
    set(_pe_tus "")
    foreach(_f IN LISTS _pe_chunk)
        if(_f MATCHES "\\.(c|cc|cxx|cpp)$")
            list(APPEND _pe_tus "${_f}")
        endif()
    endforeach()
    list(APPEND _pe_3rdparty_sources ${_pe_tus})
endmacro()

_pe_3rdparty_collect(rabbitmq-c/librabbitmq c)
_pe_3rdparty_collect(SimpleAmqpClient cpp)
_pe_3rdparty_collect(spdlog/src cpp)
_pe_3rdparty_collect(boost/libs/chrono/src cpp)
if(WIN32)
    _pe_3rdparty_collect(iconv/win c)
endif()

list(REMOVE_DUPLICATES _pe_3rdparty_sources)
list(LENGTH _pe_3rdparty_sources _pe_3rdparty_n)
message(STATUS "3rdparty: ${_pe_3rdparty_n} translation units")
unset(_pe_3rdparty_n)

add_library(3rdparty STATIC ${_pe_3rdparty_sources})
add_library(PeakExpertCE::3rdparty ALIAS 3rdparty)

set_target_properties(3rdparty PROPERTIES
    OUTPUT_NAME 3rdparty
    # Match 3rdparty.vcxproj: no /GL (avoids LNK1179 with spdlog in the static lib).
    INTERPROCEDURAL_OPTIMIZATION FALSE
)

if(NOT DEFINED PE_CE_PLATFORM_DIR)
    set(PE_CE_PLATFORM_DIR "${CMAKE_SYSTEM_PROCESSOR}")
endif()
set(_pe_3rdparty_out "${CMAKE_SOURCE_DIR}/3rdparty/${PE_CE_PLATFORM_DIR}")
set_target_properties(3rdparty PROPERTIES
    ARCHIVE_OUTPUT_DIRECTORY "${_pe_3rdparty_out}"
    LIBRARY_OUTPUT_DIRECTORY "${_pe_3rdparty_out}"
    RUNTIME_OUTPUT_DIRECTORY "${_pe_3rdparty_out}"
    ARCHIVE_OUTPUT_DIRECTORY_DEBUG "${_pe_3rdparty_out}/Debug"
    ARCHIVE_OUTPUT_DIRECTORY_RELEASE "${_pe_3rdparty_out}/Release"
    ARCHIVE_OUTPUT_DIRECTORY_RELWITHDEBINFO "${_pe_3rdparty_out}/RelWithDebInfo"
    ARCHIVE_OUTPUT_DIRECTORY_MINSIZEREL "${_pe_3rdparty_out}/MinSizeRel"
)
unset(_pe_3rdparty_out)

target_compile_definitions(3rdparty
    PUBLIC
        AMQP_STATIC
        SimpleAmqpClient_EXPORTS
        SPDLOG_COMPILED_LIB
        BOOST_ALL_NO_LIB
    PRIVATE
        HAVE_CONFIG_H
)

target_include_directories(3rdparty
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/rabbitmq-c>
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/rabbitmq-c/deprecated>
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/boost>
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/spdlog>
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/spdlog/fmt>
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}
)

if(WIN32)
    target_include_directories(3rdparty PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/iconv/win>
    )
    target_link_libraries(3rdparty PUBLIC ws2_32)
endif()

if(MSVC)
    target_compile_options(3rdparty PRIVATE /W3)
elseif(CMAKE_CXX_COMPILER_ID MATCHES "Clang|GNU")
    target_compile_options(3rdparty PRIVATE -Wno-unused-parameter)
endif()

unset(_pe_3rdparty_sources)
