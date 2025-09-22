<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div class="w-full max-w-md">
      <UPageCard>
        <UAuthForm
          ref="authForm"
          :schema="schema"
          :title="isInvitation ? 'Postavite lozinku' : 'Prijavite se'"
          :description="isInvitation ? 'Postavite vašu novu lozinku za pristup nalogu.' : 'Unesite vaše podatke za pristup nalogu.'"
          :icon="isInvitation ? 'i-lucide-key' : 'i-lucide-user'"
          :fields="fields"
          :submit="{ label: isInvitation ? 'Postavite lozinku' : 'Prijavite se', loading: isLoading }"
          @submit="handleSubmit"
        />
      </UPageCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'public'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()
const route = useRoute()
const toast = useToast()

// State za invitation flow
const isInvitation = ref(false)
const invitationToken = ref('')
const isLoading = ref(false)

// Proverava da li je ovo invitation link
onMounted(() => {
  const fragment = route.hash
  if (fragment) {
    const params = new URLSearchParams(fragment.slice(1))
    const accessToken = params.get('access_token')
    const tokenType = params.get('type')
    
    if (accessToken && tokenType === 'invite') {
      isInvitation.value = true
      invitationToken.value = accessToken
    }
  }
})

// Ako je korisnik već ulogovan, preusmeri ga
watchEffect(() => {
  if (user.value && !isInvitation.value) {
    router.push('/')
  }
})

// Polja za regularnu prijavu
const loginFields = [
  {
    name: 'email',
    type: 'text' as const,
    label: 'Email',
    placeholder: 'Unesite vaš email',
    required: true
  },
  {
    name: 'password',
    label: 'Lozinka',
    type: 'password' as const,
    placeholder: 'Unesite vašu lozinku',
    required: true
  }
]

// Polja za postavljanje password-a (invitation)
const invitationFields = [
  {
    name: 'password',
    label: 'Nova lozinka',
    type: 'password' as const,
    placeholder: 'Unesite novu lozinku',
    required: true
  },
  {
    name: 'confirmPassword',
    label: 'Potvrdite lozinku',
    type: 'password' as const,
    placeholder: 'Potvrdite novu lozinku',
    required: true
  }
]

// Computed za aktuelna polja
const fields = computed(() => {
  return isInvitation.value ? invitationFields : loginFields
})

// Schema za regularnu prijavu
const loginSchema = z.object({
  email: z.string().email('Neispravna email adresa'),
  password: z.string().min(6, 'Lozinka mora imati najmanje 6 karaktera')
})

// Schema za invitation (postavljanje password-a)
const invitationSchema = z.object({
  password: z.string().min(6, 'Lozinka mora imati najmanje 6 karaktera'),
  confirmPassword: z.string().min(6, 'Lozinka mora imati najmanje 6 karaktera')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Lozinke se ne poklapaju",
  path: ["confirmPassword"],
})

// Computed za aktuelnu schema
const schema = computed(() => {
  return isInvitation.value ? invitationSchema : loginSchema
})

type LoginSchema = z.output<typeof loginSchema>
type InvitationSchema = z.output<typeof invitationSchema>

// Unified handler za oba slučaja
async function handleSubmit(event: FormSubmitEvent<LoginSchema | InvitationSchema>) {
  if (isInvitation.value) {
    await handlePasswordSetup(event as FormSubmitEvent<InvitationSchema>)
  } else {
    await handleLogin(event as FormSubmitEvent<LoginSchema>)
  }
}

// Handle regularnu prijavu
async function handleLogin(event: FormSubmitEvent<LoginSchema>) {
  isLoading.value = true
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: event.data.email,
      password: event.data.password
    })

    if (error) {
      toast.add({
        title: 'Greška pri prijavljivanju',
        description: error.message === 'Invalid login credentials' 
          ? 'Neispravni podaci za prijavljivanje' 
          : error.message,
        color: 'error'
      })
      return
    }

    toast.add({
      title: 'Uspešno ste se prijavili',
      description: 'Dobrodošli!',
      color: 'success'
    })

    // Redirect će se desiti automatski preko watchEffect-a
  } catch (error) {
    console.error('Login error:', error)
    toast.add({
      title: 'Greška',
      description: 'Došlo je do greške. Pokušajte ponovo.',
      color: 'error'
    })
  } finally {
    isLoading.value = false
  }
}

// Handle postavljanje password-a za invitation
async function handlePasswordSetup(event: FormSubmitEvent<InvitationSchema>) {
  isLoading.value = true
  
  try {
    // Prvo verifikujemo token iz URL-a
    const fragment = route.hash.slice(1)
    const params = new URLSearchParams(fragment)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    
    if (!accessToken) {
      throw new Error('Nevalidan invitation link')
    }

    // Postavimo session sa invitation token-om
    const { data, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || ''
    })

    if (sessionError) {
      throw new Error('Nevalidan ili istekao invitation link')
    }

    // Sada ažuriraj password
    const { error: updateError } = await supabase.auth.updateUser({
      password: event.data.password
    })

    if (updateError) {
      throw updateError
    }

    toast.add({
      title: 'Lozinka je uspešno postavljena',
      description: 'Možete se sada prijaviti sa vašom novom lozinkom.',
      color: 'success'
    })

    // Resetuj invitation state i očisti URL
    isInvitation.value = false
    invitationToken.value = ''
    
    // Očisti hash iz URL-a
    await router.replace('/login')
    
    // Refresh stranice da se učita login forma
    window.location.reload()

  } catch (error: any) {
    console.error('Password setup error:', error)
    toast.add({
      title: 'Greška pri postavljanju lozinke',
      description: error.message || 'Došlo je do greške. Pokušajte ponovo.',
      color: 'error'
    })
  } finally {
    isLoading.value = false
  }
}
</script>