#!/usr/bin/perl -w

use Text::CSV_XS;

my %CSV_OPTS_IN = (
    'binary'        => 1,
    'quote_char'    => '"',
    'escape_char'   => '"',
);
my %CSV_OPTS_OUT = %CSV_OPTS_IN;
$CSV_OPTS_OUT{'always_quote'} = 1;

my $CSV_IN  = Text::CSV_XS->new(\%CSV_OPTS_IN)  or die "" . Text::CSV_XS->error_diag;

sub main() {
    my $start = localtime;
    print "$start\n";
    my $fh = *STDIN;

    until ($CSV_IN->eof) {
        my $hr = $CSV_IN->getline($fh) or do {
            last if $CSV_IN->eof;
            die "CSV_IN getline error: " . Text::CSV_XS->error_diag;
        };
        my $a = 0;
    }

    my $end = localtime;
    print "$end\n";
}

main();
