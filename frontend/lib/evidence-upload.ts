export type EvidenceFileLike = {
  name: string
  type: string
  size: number
}

export type EvidenceUploadRules = {
  acceptedMimeTypes: string[]
  maxUploadBytes: number
}

export function validateEvidenceFile(file: EvidenceFileLike | null, rules: EvidenceUploadRules): string | null {
  if (!file) return 'Choose a PDF, JPG, or PNG file.'
  if (!rules.acceptedMimeTypes.includes(file.type)) return 'Only PDF, JPG, and PNG files are allowed.'
  if (file.size <= 0) return 'The selected file is empty.'
  if (file.size > rules.maxUploadBytes) {
    return 'File exceeds the ' + Math.round(rules.maxUploadBytes / 1024 / 1024) + ' MB limit.'
  }
  return null
}