(define-constant ERR_INVALID_EXPIRATION (err u400))
(define-constant ERR_DIRECT_CALL_REQUIRED (err u403))
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
    revoked-at: (optional uint),
  }
)

(define-public (issue-attestation
    (subject principal)
    (issuer-name (string-ascii 64))
    (role (string-ascii 32))
    (expires-at uint)
  )
  (begin
    (asserts! (is-eq tx-sender contract-caller) ERR_DIRECT_CALL_REQUIRED)
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
      revoked-at: none,
    })
    (print {
      event: "origin-attestation-issued",
      attester: tx-sender,
      subject: subject,
      issuer-name: issuer-name,
      role: role,
      issued-at: burn-block-height,
      expires-at: expires-at,
      revoked: false,
      revoked-at: none,
    })
    (ok true)
  )
)

(define-public (revoke-attestation (subject principal))
  (begin
    (asserts! (is-eq tx-sender contract-caller) ERR_DIRECT_CALL_REQUIRED)
    (let ((key {
        attester: tx-sender,
        subject: subject,
      }))
      (match (map-get? attestations key)
        attestation (begin
          (map-set attestations key
            (merge attestation {
              revoked: true,
              revoked-at: (some burn-block-height),
            })
          )
          (print {
            event: "origin-attestation-revoked",
            attester: tx-sender,
            subject: subject,
            issuer-name: (get issuer-name attestation),
            role: (get role attestation),
            issued-at: (get issued-at attestation),
            expires-at: (get expires-at attestation),
            revoked: true,
            revoked-at: (some burn-block-height),
          })
          (ok true)
        )
        ERR_NOT_FOUND
      )
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
