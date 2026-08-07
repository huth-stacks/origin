(define-constant ERR_REQUEST_REPLAY (err u409))
(define-constant ERR_DIRECT_CALL_REQUIRED (err u403))
(define-constant ERR_INVALID_REQUEST_ID (err u423))

(define-map proofs
  {
    deployer: principal,
    request-id: (buff 32),
  }
  {
    subject: principal,
    domain: (string-ascii 253),
    published-at: uint,
  }
)

(define-public (publish-proof
    (request-id (buff 32))
    (subject principal)
    (domain (string-ascii 253))
  )
  (begin
    (asserts! (is-eq tx-sender contract-caller) ERR_DIRECT_CALL_REQUIRED)
    (asserts! (is-eq (len request-id) u32) ERR_INVALID_REQUEST_ID)
    (asserts!
      (map-insert proofs {
        deployer: tx-sender,
        request-id: request-id,
      } {
        subject: subject,
        domain: domain,
        published-at: burn-block-height,
      })
      ERR_REQUEST_REPLAY
    )
    (print {
      event: "origin-domain-proof-published",
      deployer: tx-sender,
      request-id: request-id,
      subject: subject,
      domain: domain,
      published-at: burn-block-height,
    })
    (ok true)
  )
)

(define-read-only (get-proof
    (deployer principal)
    (request-id (buff 32))
  )
  (map-get? proofs {
    deployer: deployer,
    request-id: request-id,
  })
)
