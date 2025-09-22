<template>
    <UCard class="shadow-sm">
        <template #header>
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="text-lg font-semibold">{{ title }}</h3>
                    <p class="text-sm text-gray-600">{{ description }}</p>
                </div>
                <div class="flex items-center gap-3">
                    <span class="text-sm">Enabled</span>
                    <USwitch v-model="localState.enabled" />
                </div>
            </div>
        </template>

        <UForm :schema="formSchema" :state="localState" @submit="emitSave" class="space-y-6">
            <div class="grid grid-cols-1 gap-6">
                <UInput v-model="localState.subject" placeholder="" :ui="{ base: 'peer relative' }">
                    <label
                        class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                        <span class="inline-flex bg-default px-1">Subject</span>
                    </label>
                </UInput>

                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <label class="text-sm font-medium text-gray-700">Content</label>
                        <div class="flex items-center gap-2">
                            <UButton size="xs" variant="soft" @click="formatText('bold')"><span class="font-semibold">B</span></UButton>
                            <UButton size="xs" variant="soft" @click="formatText('italic')"><span class="italic">I</span></UButton>
                            <UButton size="xs" variant="outline" @click="togglePreview">{{ showPreview ? 'Edit' : 'Preview' }}</UButton>
                        </div>
                    </div>

                    <!-- Variable buttons -->
                    <div v-if="!showPreview" class="flex flex-wrap gap-1 p-2 bg-gray-50 rounded-md border border-gray-300">
                        <UButton
                            v-for="variable in availableVariables"
                            :key="variable"
                            size="xs"
                            variant="outline"
                            :ui="{ padding: { xs: 'px-2 py-1' } }"
                            @click="insertVariable(variable)"
                        >
                            {{ variable }}
                        </UButton>
                    </div>

                    <div v-if="!showPreview" class="border border-gray-300 rounded-md">
                        <div
                            ref="editorRef"
                            class="min-h-[220px] p-3 prose prose-sm max-w-none focus:outline-none"
                            contenteditable
                            :placeholder="'Write your email content here…'"
                            @input="onEditorInput"
                        />
                    </div>

                    <div v-else class="border border-gray-300 rounded-md bg-gray-50">
                        <div class="min-h-[220px] p-3 prose prose-sm max-w-none">
                            <div v-html="renderedPreview"></div>
                        </div>
                    </div>
                </div>
            </div>
        </UForm>

        <template #footer>
            <div class="flex justify-end gap-2">
                <UButton @click="emitSave" color="primary" :loading="loading">Save Template</UButton>
            </div>
        </template>
    </UCard>
</template>

<script setup>
    const props = defineProps({
        title: { type: String, default: 'Email Template' },
        description: { type: String, default: '' },
        modelValue: {
            type: Object,
            default: () => ({ enabled: true, subject: '', bodyHtml: '' })
        },
        loading: { type: Boolean, default: false }
    })

    const emit = defineEmits(['update:modelValue', 'save'])

    const showPreview = ref(false)
    const editorRef = ref(null)
    const hasUserEdited = ref(false)

    const localState = reactive({
        enabled: props.modelValue.enabled ?? true,
        subject: props.modelValue.subject || '',
        bodyHtml: props.modelValue.bodyHtml || ''
    })

    // Sync from parent only until user starts editing
    watch(() => props.modelValue, (val) => {
        if (hasUserEdited.value) return
        localState.enabled = val?.enabled ?? true
        localState.subject = val?.subject || ''
        localState.bodyHtml = val?.bodyHtml || ''
        nextTick(() => {
            if (editorRef.value) editorRef.value.innerHTML = localState.bodyHtml || ''
        })
    }, { immediate: true, deep: true })

    watch(localState, () => {
        emit('update:modelValue', { ...localState })
    }, { deep: true })

    watch(() => localState.subject, () => { hasUserEdited.value = true })
    watch(() => localState.enabled, () => { hasUserEdited.value = true })

    const formSchema = {
        subject: { required: true, type: 'string', message: 'Subject is required' },
        bodyHtml: { required: true, type: 'string', message: 'Content is required' }
    }

    const onEditorInput = () => {
        localState.bodyHtml = editorRef.value?.innerHTML || ''
        hasUserEdited.value = true
    }

    const formatText = (command) => {
        if (showPreview.value) return
        if (editorRef.value) {
            editorRef.value.focus()
            document.execCommand(command, false, null)
            onEditorInput()
        }
    }

    const togglePreview = () => {
        showPreview.value = !showPreview.value
        if (!showPreview.value) {
            nextTick(() => {
                if (editorRef.value) editorRef.value.innerHTML = localState.bodyHtml || ''
            })
        }
    }

    const renderedPreview = computed(() => localState.bodyHtml || '')

    // Available variables for insertion
    const availableVariables = [
        '{{recipientName}}',
        '{{recipientEmail}}',
        '{{eventName}}',
        '{{firstName}}',
        '{{lastName}}',
        '{{fullName}}',
        '{{companyName}}',
    ]

    const insertVariable = (variable) => {
        if (showPreview.value || !editorRef.value) return

        editorRef.value.focus()

        // Insert variable at cursor position
        const selection = window.getSelection()
        const range = selection.getRangeAt(0)

        // Create text node with the variable
        const textNode = document.createTextNode(variable)

        // Insert the text node at cursor position
        range.insertNode(textNode)

        // Move cursor after inserted text
        range.setStartAfter(textNode)
        range.setEndAfter(textNode)
        selection.removeAllRanges()
        selection.addRange(range)

        // Update the local state
        onEditorInput()
    }

    onMounted(() => {
        nextTick(() => {
            if (editorRef.value) editorRef.value.innerHTML = localState.bodyHtml || ''
        })
    })

    const emitSave = () => emit('save', { ...localState })
</script>
