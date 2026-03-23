# Vue Integration

Vue 3 component for PrivacyLayer private transfers using the Composition API.

## Setup

```bash
# In your Vue 3 project
cp PrivateTransfer.vue src/components/
```

## Usage

```vue
<template>
  <PrivateTransfer />
</template>

<script setup>
import PrivateTransfer from './components/PrivateTransfer.vue';
</script>
```

## Features

- Reactive deposit/withdraw flow
- Note management with selection UI
- Loading states and error handling
- Scoped CSS with dark mode ready styling
