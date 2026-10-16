// The biology shown in pre2 is real: the SRY coding sequence translates to the SRY protein with the standard code,
// and the chromosome figures match GRCh38.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SRY_CDS, SRY_PROTEIN, translate, transcribe, codonToAA } from '../src/ch/pre2/sry.js';
import { CHR, SRY, PAR1 } from '../src/ch/pre2/bio.js';

test('SRY: CDS → mRNA → protein (UniProt Q05066)', () => {
  assert.equal(SRY_CDS.length, 615);
  assert.equal(SRY_CDS.slice(0, 3), 'ATG');
  assert.equal(codonToAA(SRY_CDS.slice(-3)), '*');
  assert.equal(translate(transcribe(SRY_CDS)), SRY_PROTEIN);
  assert.equal(SRY_PROTEIN.length, 204);
});

test('sex chromosomes: lengths and landmarks', () => {
  assert.ok(Math.abs(CHR.X.len - 156.04) < 0.01 && Math.abs(CHR.Y.len - 57.23) < 0.01);
  assert.ok(CHR.Y.cen < CHR.X.cen && SRY > PAR1);
});
