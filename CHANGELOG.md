0.10.1
 - support for `escapeFormulas` (escape potentiolly dangerous formula
   expressions)

0.9.4
 - fix error handling (emit instead of throwing) - thanks to Alex J
   Burke for the patch

0.9.3
 - Don't read quoted empty string as a single double-quote characters -
   thanks to Ed McManus for the bug report
 - Added `columnNames` option - thanks to leesei
   (https://github.com/leesei)

0.9.1
  - Better support for very large files - thanks to @esatterwhite /
    https://github.com/esatterwhite
  - Strip BOM to handle a file encoded as ucs2 - thanks to Kei Son
    (https://github.com/heycalmdown)
  - Include flags option to pass through to createRead/WriteStream -
    thanks to @davidmarkclements / https://github.com/davidmarkclements

0.1.3

 - `CsvReader` - BUGFIX: last column was not passed to the `data` listener
 - `CsvWriter` - `null` string written as an empty field rather than throwing an exception
 - executable `reshuffle` script to strip and/or reorder columns of a CSV stream on stdin

0.1.1 - 0.1.2

 - package.json added

0.1.0 

 - minimal implementation
