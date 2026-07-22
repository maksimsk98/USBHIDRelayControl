#ifndef RABBITMQ_C_EXPORT_H
#define RABBITMQ_C_EXPORT_H

/*
 * Hand-written (not CMake GenerateExportHeader): shared by Windows/MSVC
 * (3rdparty.vcxproj) and Linux/GCC. Platform visibility follows the same
 * pattern as DChannel/src/Utility/DChannelExport.hpp.
 *
 * Macro names stay rabbitmq-c / GenerateExportHeader compatible:
 *   AMQP_STATIC, rabbitmq_EXPORTS, AMQP_EXPORT, AMQP_NO_EXPORT,
 *   AMQP_DEPRECATED, AMQP_DEPRECATED_EXPORT, AMQP_DEPRECATED_NO_EXPORT
 */

#ifdef AMQP_STATIC
#  define AMQP_EXPORT
#  define AMQP_NO_EXPORT
#else
#  if defined(WIN32) || defined(_WIN32) || defined(__WIN32__) || defined(__NT__)
#    ifdef _MSC_VER
#      ifdef rabbitmq_EXPORTS
#        define AMQP_EXPORT __declspec(dllexport)
#      else
#        define AMQP_EXPORT __declspec(dllimport)
#      endif
#    else
      /* MinGW or other Windows compilers */
#      ifdef rabbitmq_EXPORTS
#        define AMQP_EXPORT __attribute__((dllexport))
#      else
#        define AMQP_EXPORT __attribute__((dllimport))
#      endif
#    endif
#    define AMQP_NO_EXPORT
#  else
    /* UNIX */
#    ifdef rabbitmq_EXPORTS
#      define AMQP_EXPORT __attribute__((visibility("default")))
#    else
#      define AMQP_EXPORT
#    endif
#    if defined(__GNUC__) && __GNUC__ >= 4
#      define AMQP_NO_EXPORT __attribute__((visibility("hidden")))
#    else
#      define AMQP_NO_EXPORT
#    endif
#  endif
#endif

#if defined(WIN32) || defined(_WIN32) || defined(__WIN32__) || defined(__NT__)
#  ifdef _MSC_VER
#    define AMQP_DEPRECATED __declspec(deprecated)
#  else
#    define AMQP_DEPRECATED __attribute__((__deprecated__))
#  endif
#elif defined(__GNUC__) && (__GNUC__ > 3 || (__GNUC__ == 3 && __GNUC_MINOR__ >= 1))
#  define AMQP_DEPRECATED __attribute__((__deprecated__))
#else
#  define AMQP_DEPRECATED
#endif

#define AMQP_DEPRECATED_EXPORT AMQP_EXPORT AMQP_DEPRECATED
#define AMQP_DEPRECATED_NO_EXPORT AMQP_NO_EXPORT AMQP_DEPRECATED

#endif /* RABBITMQ_C_EXPORT_H */
