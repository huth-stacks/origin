(define-public (issue-v2
    (subject principal)
    (issuer-name (string-ascii 64))
    (role (string-ascii 32))
    (expires-at uint)
    (request-id (buff 32))
  )
  (contract-call? .origin-registry-v2 issue-attestation subject issuer-name role
    expires-at request-id
  )
)

(define-public (revoke-v2
    (subject principal)
    (request-id (buff 32))
  )
  (contract-call? .origin-registry-v2 revoke-attestation subject request-id)
)
