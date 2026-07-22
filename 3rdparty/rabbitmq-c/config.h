#ifndef CONFIG_H
#define CONFIG_H

/*
 * Hand-written, not CMake-generated: this header is shared by the Windows/MSVC
 * build (this ThirdParty.vcxproj) and the Linux build, so the HAVE_POLL/
 * HAVE_SELECT/AMQ_PLATFORM values are resolved by the preprocessor at compile
 * time instead of being baked in for one platform.
 */
#if defined(_WIN32)
#define AMQ_PLATFORM "Windows"
/* Windows has select() via Winsock; POSIX poll() is not available. */
#define HAVE_SELECT
#undef HAVE_POLL
#elif defined(__linux__)
#define AMQ_PLATFORM "Linux"
#define HAVE_SELECT
#define HAVE_POLL
#else
#define AMQ_PLATFORM "Unix"
#define HAVE_SELECT
#define HAVE_POLL
#endif

/* SSL/AMQPS is not used anywhere in PeakExpertNoGUI - only the plain
   AmqpClient::Channel::Create() overload is called - so amqp_openssl.c and
   the OpenSSL-dependent bits are excluded from this build on both platforms. */
#undef ENABLE_SSL_ENGINE_API

#endif /* CONFIG_H */
