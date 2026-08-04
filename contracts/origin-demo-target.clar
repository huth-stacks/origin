(define-data-var invocation-count uint u0)

(define-public (record-demo-action)
  (let ((next-count (+ (var-get invocation-count) u1)))
    (var-set invocation-count next-count)
    (print {
      event: "origin-demo-action",
      caller: tx-sender,
      invocation-count: next-count,
    })
    (ok next-count)
  )
)

(define-read-only (get-invocation-count)
  (var-get invocation-count)
)
