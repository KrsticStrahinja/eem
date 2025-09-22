<template>
    <div class="flex flex-col gap-2">
        <UInput
            v-if="field.type === 'text'"
            :model-value="modelValue"
            @update:model-value="$emit('update:modelValue', $event)"
            :placeholder="''"
            :ui="{ base: 'peer' }"
            :color="error ? 'error' : undefined"
            class="w-full"
        >
            <label class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                <span class="inline-flex bg-default px-1">{{ field.placeholder }}{{ field.required ? ' *' : '' }}</span>
            </label>
        </UInput>

        <UInput
            v-else-if="field.type === 'email'"
            type="email"
            :model-value="modelValue"
            @update:model-value="$emit('update:modelValue', $event)"
            :placeholder="''"
            :ui="{ base: 'peer' }"
            :color="error ? 'error' : undefined"
            class="w-full"
        >
            <label class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                <span class="inline-flex bg-default px-1">{{ field.placeholder }}{{ field.required ? ' *' : '' }}</span>
            </label>
        </UInput>

        <UInput
            v-else-if="field.type === 'date'"
            type="date"
            :model-value="modelValue"
            @update:model-value="$emit('update:modelValue', $event)"
            :color="error ? 'error' : undefined"
            class="w-full"
        />

        <USelect
            v-else-if="field.type === 'select'"
            :model-value="modelValue"
            @update:model-value="$emit('update:modelValue', $event)"
            :items="(field.options || []).map(o => ({ label: o.charAt(0).toUpperCase() + o.slice(1), value: o }))"
            :placeholder="field.placeholder || field.name"
            :color="error ? 'error' : undefined"
            class="w-full"
        />

        <div v-else-if="field.type === 'checkbox'" class="flex flex-col gap-2">
            <UCheckbox
                v-for="opt in field.options || []"
                :key="opt"
                :label="opt"
                :model-value="Array.isArray(modelValue) ? modelValue.includes(opt) : false"
                @update:model-value="(checked) => toggleCheckbox(opt, checked)"
                class="w-full"
            />
        </div>

        <div v-else-if="field.type === 'radio'" class="flex flex-col gap-2">
            <label v-for="opt in field.options || []" :key="opt" class="flex items-center gap-2 cursor-pointer">
                <input
                    type="radio"
                    :name="field.id"
                    :value="opt"
                    :checked="modelValue === opt"
                    @change="$emit('update:modelValue', opt)"
                    class="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                />
                <span class="text-sm">{{ opt }}</span>
            </label>
        </div>

        <p v-if="error" class="text-xs text-red-600">{{ error }}</p>
    </div>
</template>

<script setup>
const props = defineProps({
    field: Object,
    modelValue: [String, Array, Number],
    error: String
})

const emit = defineEmits(['update:modelValue'])

const toggleCheckbox = (option, checked) => {
    const current = Array.isArray(props.modelValue) ? [...props.modelValue] : []
    const idx = current.indexOf(option)
    
    if (checked && idx === -1) current.push(option)
    if (!checked && idx !== -1) current.splice(idx, 1)
    
    emit('update:modelValue', current)
}
</script>