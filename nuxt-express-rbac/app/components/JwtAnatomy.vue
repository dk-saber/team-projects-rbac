<template>
  <div class="rounded-xl border border-ink-600 bg-ink-900 p-4 font-mono text-[13px] leading-relaxed sm:p-5">
    <p class="break-all">
      <span class="text-signal-400">eyJhbGciOiJIUzI1NiJ9</span><span class="text-slate-600">.</span
      ><span class="text-gold-400">eyJpZCI6IjY1YSIsImp0aSI6ImY4YzEifQ</span
      ><span class="text-slate-600">.</span
      ><span class="text-rust-400">4f9d2a7b1e8c…</span>
    </p>
    <div class="mt-4 grid grid-cols-3 gap-3 text-[11px] text-slate-500">
      <div>
        <span class="text-signal-400">■</span>
        Header — algorithm (HS256)
      </div>
      <div>
        <span class="text-gold-400">■</span>
        Payload — id, jti, role
      </div>
      <div>
        <span class="text-rust-400">■</span>
        Signature — HMAC secret server
      </div>
    </div>
  </div>
</template>
