<template>
    <div class="p-6">
        <h1 class="text-2xl font-bold mb-4">Dashboard Home</h1>
        <p class="text-gray-600 mb-6">Welcome to your dashboard! This content is now inside the main layout slot.</p>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <UCard class="shadow-sm">
                <template #header>
                    <h3 class="text-lg font-semibold">Welcome</h3>
                </template>
                <p>This is your main dashboard content area.</p>
            </UCard>

            <UCard class="shadow-sm">
                <template #header>
                    <h3 class="text-lg font-semibold">Navigation</h3>
                </template>
                <p>Use the sidebar to navigate between different sections.</p>
            </UCard>

            <UCard class="shadow-sm">
                <template #header>
                    <h3 class="text-lg font-semibold">Content</h3>
                </template>
                <p>All page content will be displayed in this area.</p>
            </UCard>
        </div>
    </div>
</template>