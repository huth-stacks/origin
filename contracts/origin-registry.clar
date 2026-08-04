(define-constant ERR_INVALID_EXPIRATION (err u400))
(define-constant ERR_NOT_FOUND (err u404))

(define-map attestations
  {
    attester: principal,
    subject: principal,
  }
  {
    issuer-name: (string-ascii 64),
    role: (string-ascii 32),
    issued-at: uint,
    expires-at: uint,
    revoked: bool,
  }
)

(define-public (issue-attestation
    (subject principal)
    (issuer-name (string-ascii 64))
    (role (string-ascii 32))
    (expires-at uint)
  )
  (begin
    (asserts! (> expires-at burn-block-height) ERR_INVALID_EXPIRATION)
    (map-set attestations {
      attester: tx-sender,
      subject: subject,
    } {
      issuer-name: issuer-name,
      role: role,
      issued-at: burn-block-height,
      expires-at: expires-at,
      revoked: false,
    })
    (print {
      event: "origin-attestation-issued",
      attester: tx-sender,
      subject: subject,
      issuer-name: issuer-name,
      role: role,
      issued-at: burn-block-height,
      expires-at: expires-at,
    })
    (ok true)
  )
)

(define-public (revoke-attestation (subject principal))
  (let ((key {
      attester: tx-sender,
      subject: subject,
    }))
    (match (map-get? attestations key)
      attestation (begin
        (map-set attestations key (merge attestation { revoked: true }))
        (print {
          event: "origin-attestation-revoked",
          attester: tx-sender,
          subject: subject,
          revoked-at: burn-block-height,
        })
        (ok true)
      )
      ERR_NOT_FOUND
    )
  )
)

(define-read-only (get-attestation
    (attester principal)
    (subject principal)
  )
  (map-get? attestations {
    attester: attester,
    subject: subject,
  })
)
