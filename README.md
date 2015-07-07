dce-paella-extensions
=====================

This module contains [Harvard DCE](http://www.dce.harvard.edu/)-specific extensions to the [Paella video player](https://github.com/polimediaupv/paella).

It is not a standard Node or browser module (as of now), but rather, a way to package extensions for the build process so that we can avoid forking Paella and maintaining that fork.

Installation
------------

    npm install dce-paella-extensions

Usage
-----

    cd node_modules/dce-paella
    make copy-to-parent

DCE modifications not installed by this package
-----------------------------------------------

- Gruntfile.js
- config/config.json
- plugins/es.upv.paella.*

Tests
-----

Run tests with `make test`.
