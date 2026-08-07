(define-public (issue-v2
    (subject principal)
    (issuer-name (string-ascii 64))
    (role (string-ascii 32))
    (expires-at uint)
  )
  (contract-call? .origin-registry-v2 issue-attestation subject issuer-name role
    expires-at
  )
)

(define-public (revoke-v2 (subject principal))
  (contract-call? .origin-registry-v2 revoke-attestation subject)
)
