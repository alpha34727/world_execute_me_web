// SRY — the sex-determining gene on the Y chromosome — and the central dogma that expresses it:
// DNA is replicated, transcribed into mRNA (T → U), and translated three bases at a time into a chain of amino acids.
// Sequences are public reference data:
//   coding sequence: NCBI RefSeq NM_003140.3, CDS 80..694 (615 nt, stop codon included)
//   protein:         UniProt Q05066 (SRY_HUMAN), 204 aa
// test/bio.test.js checks that translating the CDS with the standard genetic code gives exactly the protein.

export const SRY_CDS =
  'ATGCAATCATATGCTTCTGCTATGTTAAGCGTATTCAACAGCGATGATTACAGTCCAGCTGTGCAAGAGA' +
  'ATATTCCCGCTCTCCGGAGAAGCTCTTCCTTCCTTTGCACTGAAAGCTGTAACTCTAAGTATCAGTGTGA' +
  'AACGGGAGAAAACAGTAAAGGCAACGTCCAGGATAGAGTGAAGCGACCCATGAACGCATTCATCGTGTGG' +
  'TCTCGCGATCAGAGGCGCAAGATGGCTCTAGAGAATCCCAGAATGCGAAACTCAGAGATCAGCAAGCAGC' +
  'TGGGATACCAGTGGAAAATGCTTACTGAAGCCGAAAAATGGCCATTCTTCCAGGAGGCACAGAAATTACA' +
  'GGCCATGCACAGAGAGAAATACCCGAATTATAAGTATCGACCTCGTCGGAAGGCGAAGATGCTGCCGAAG' +
  'AATTGCAGTTTGCTTCCCGCAGATCCCGCTTCGGTACTCTGCAGCGAAGTGCAACTGGACAACAGGTTGT' +
  'ACAGGGATGACTGTACGAAAGCCACACACTCAAGAATGGAGCACCAGCTAGGCCACTTACCGCCCATCAA' +
  'CGCAGCCAGCTCACCGCAGCAACGGGACCGCTACAGCCACTGGACAAAGCTGTAG';

export const SRY_PROTEIN =
  'MQSYASAMLSVFNSDDYSPAVQENIPALRRSSSFLCTESCNSKYQCETGENSKGNVQDRV' +
  'KRPMNAFIVWSRDQRRKMALENPRMRNSEISKQLGYQWKMLTEAEKWPFFQEAQKLQAMH' +
  'REKYPNYKYRPRRKAKMLPKNCSLLPADPASVLCSEVQLDNRLYRDDCTKATHSRMEHQL' +
  'GHLPPINAASSPQQRDRYSHWTKL';

// the standard genetic code (NCBI translation table 1), codons in TCAG order: first base slowest
const BASES = 'TCAG';
const AA = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG';
export const codonToAA = (codon) => {
  const c = codon.replace(/U/g, 'T');
  return AA[BASES.indexOf(c[0]) * 16 + BASES.indexOf(c[1]) * 4 + BASES.indexOf(c[2])];
};
export const AA3 = { A: 'Ala', R: 'Arg', N: 'Asn', D: 'Asp', C: 'Cys', Q: 'Gln', E: 'Glu', G: 'Gly', H: 'His', I: 'Ile', L: 'Leu', K: 'Lys', M: 'Met', F: 'Phe', P: 'Pro', S: 'Ser', T: 'Thr', W: 'Trp', Y: 'Tyr', V: 'Val', '*': 'Stop' };
export const COMPLEMENT = { A: 'T', T: 'A', C: 'G', G: 'C', U: 'A' };
export const transcribe = (dna) => dna.replace(/T/g, 'U'); // the mRNA has the coding strand's sequence, U for T
export function translate(mrna) {
  let out = '';
  for (let i = 0; i + 3 <= mrna.length; i += 3) {
    const a = codonToAA(mrna.slice(i, i + 3));
    if (a === '*') break;
    out += a;
  }
  return out;
}
