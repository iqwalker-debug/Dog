<script setup lang="ts">
function onSignIn() {
  // NOTE: stub until Phase 3 wires Clerk
  console.log("sign-in clicked");
}
</script>

<template>
  <main class="min-h-screen bg-kennel-navy text-white flex flex-col items-center justify-center p-6">
    <div
      class="w-20 h-20 rounded-2xl bg-kennel-sun flex items-center justify-center text-4xl font-black text-kennel-navy shadow-lg"
      aria-label="Kennel logo placeholder"
    >
      K
    </div>
    <h1 class="mt-6 text-5xl font-bold tracking-tight">Kennel</h1>
    <p class="mt-3 text-lg text-kennel-sun max-w-md text-center">
      The AI build platform for dog businesses.
    </p>
    <button
      type="button"
      class="mt-8 px-6 py-3 rounded-lg bg-kennel-sun text-kennel-navy font-semibold hover:brightness-95 transition"
      @click="onSignIn"
    >
      Sign in
    </button>
  </main>
</template>
