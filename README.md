dce-paella-extensions
=====================

This module contains [Harvard DCE](http://www.dce.harvard.edu/)-specific extensions to the [Paella video player](https://github.com/polimediaupv/paella).

It is not a standard Node or browser module (as of now), but rather, a way to package extensions for the build process so that we can avoid forking Paella and maintaining that fork.

Installation
------------

    npm install dce-paella-extensions

Usage
-----

You need to copy your stuff out of this module to where you need it yourself. Sorry. The DCE fork of paella-matterhorn does it in the `copy-extensions-to-paella` target of its [Makefile](https://github.com/harvard-dce/paella-matterhorn/blob/using-upstream-paella-directly/Makefile).

DCE modifications not installed by this package
-----------------------------------------------

- Gruntfile.js
- config/config.json
- plugins/es.upv.paella.*

Tests
-----

Run tests with `make test`.
