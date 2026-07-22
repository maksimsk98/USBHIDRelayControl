# iconv on Linux

No vendored sources here on purpose: glibc already implements `iconv_open`/`iconv`/
`iconv_close` as part of libc, declared in the system `<iconv.h>`. Nothing to
compile or link beyond the standard C library. `win/` exists because Windows has
no built-in equivalent - that's the only platform that needs a vendored
implementation (win-iconv).

If this ever needs to target a non-glibc libc (musl, etc.) without a native
iconv, GNU libiconv (https://www.gnu.org/software/libiconv/) would need to be
vendored here instead - not done now since it's Autotools-based and nothing
currently requires it.
