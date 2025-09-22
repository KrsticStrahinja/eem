<template>
    <UDashboardGroup>
        <UDashboardSidebar collapsible resizable :ui="{ footer: 'border-t border-default' }">
            <template #header="{ collapsed }">
                <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-layout-dashboard" class="h-6 w-6 text-primary" />
                    <span v-if="!collapsed" class="font-semibold text-lg">Dashboard</span>
                </div>
            </template>

            <template #default="{ collapsed }">
                <UButton :label="collapsed ? undefined : 'Search...'" icon="i-lucide-search" color="neutral"
                    variant="outline" block :square="collapsed">
                    <template v-if="!collapsed" #trailing>
                        <div class="flex items-center gap-0.5 ms-auto">
                            <UKbd value="meta" variant="subtle" />
                            <UKbd value="K" variant="subtle" />
                        </div>
                    </template>
                </UButton>

                <UNavigationMenu :collapsed="collapsed" :items="items[0]" orientation="vertical" />
                <UNavigationMenu :collapsed="collapsed" :items="items[1]" orientation="vertical" class="mt-auto" />
            </template>

            <template #footer="{ collapsed }">
                <UDropdownMenu :items="userMenuItems">
                    <UButton 
                        icon="i-lucide-user"
                        :label="collapsed ? undefined : userEmail" 
                        color="neutral" 
                        variant="ghost" 
                        class="w-full"
                        :block="collapsed" />
                </UDropdownMenu>
            </template>
        </UDashboardSidebar>

        <div class="flex-1 overflow-y-auto">
            <slot />
        </div>
    </UDashboardGroup>
</template>

<script setup>
    const user = useSupabaseUser()
    const supabase = useSupabaseClient()
    const router = useRouter()
    const toast = useToast()

    // Reactive computed za user email
    const userEmail = computed(() => {
        if (!user.value) {
            return 'Korisnik'
        }

        return user.value.email || 'Korisnik'
    })

    // Watch user changes
    watch(user, (newUser) => {
        // User changed watcher
    }, { immediate: true })

    async function handleLogout() {
        try {
            const { error } = await supabase.auth.signOut()
            if (error) throw error
            
            toast.add({
                title: 'Uspešno ste se odjavili',
                description: 'Vidimo se uskoro!',
                color: 'success'
            })
            
            await router.push('/login')
        } catch (error) {
            console.error('Logout error:', error)
            toast.add({
                title: 'Greška',
                description: 'Došlo je do greške pri odjavljivanju.',
                color: 'error'
            })
        }
    }

    const userMenuItems = [
        [{
            label: 'Odjavite se',
            icon: 'i-lucide-log-out',
            color: 'error',
            onClick: handleLogout
        }]
    ]

    const items = [
        [
            {
                label: 'Home',
                icon: 'i-lucide-house',
                to: '/'
            },
            {
                label: 'Events',
                icon: 'i-lucide-calendar',
                to: '/events'
            },
            {
                label: 'Attendees',
                icon: 'i-lucide-users',
                to: '/attendees'
            },
            {
                label: 'Accommodations',
                icon: 'i-lucide-bed',
                to: '/accommodations'
            },
            {
                label: 'Settings',
                icon: 'i-lucide-settings',
                children: [
                {
                    label: 'Emails',
                    icon: 'i-lucide-mail',
                    to: '/settings/email'
                },
                {
                    label: 'Exports',
                    icon: 'i-lucide-download',
                    to: '/settings/export'
                },
                {
                    label: 'Logs',
                    icon: 'i-lucide-file-text',
                    to: '/settings/logs'
                }
            ]
        }
    ],
    [
        {
            label: 'Help & Support',
            icon: 'i-lucide-info',
        }
        ]
    ]
</script>