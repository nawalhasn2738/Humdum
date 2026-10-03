import test from 'node:test'
import assert from 'node:assert/strict'
import { validateEvidenceFile } from '../lib/evidence-upload.ts'

const rules = {
  acceptedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  maxUploadBytes: 10 * 1024 * 1024,
}

test('accepts only configured evidence formats within the size limit', () => {
  assert.equal(validateEvidenceFile({ name: 'proof.pdf', type: 'application/pdf', size: 100 }, rules), null)
  assert.equal(validateEvidenceFile({ name: 'proof.txt', type: 'text/plain', size: 100 }, rules), 'Only PDF, JPG, and PNG files are allowed.')
})

test('rejects missing, empty, and oversized evidence', () => {
  assert.equal(validateEvidenceFile(null, rules), 'Choose a PDF, JPG, or PNG file.')
  assert.equal(validateEvidenceFile({ name: 'empty.pdf', type: 'application/pdf', size: 0 }, rules), 'The selected file is empty.')
  assert.equal(validateEvidenceFile({ name: 'large.pdf', type: 'application/pdf', size: rules.maxUploadBytes + 1 }, rules), 'File exceeds the 10 MB limit.')
})