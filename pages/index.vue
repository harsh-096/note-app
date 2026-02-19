<template>
  <main class="min-h-screen p-6">
    <h1 class="text-3xl font-semibold">Welcome</h1>
    <p class="mt-2 text-sm text-gray-600">Choose where to go:</p>
    <div class="mt-4 flex gap-3">
      <NuxtLink class="rounded bg-black px-4 py-2 text-white" to="/note">Notes</NuxtLink>
      <NuxtLink class="rounded border border-black px-4 py-2" to="/register">Register</NuxtLink>
    </div>
  </main>
</template>
