# Angular Integration

Angular standalone component for PrivacyLayer private transfers using signals.

## Setup

```bash
# In your Angular 17+ project
cp private-transfer.component.ts src/app/components/
```

## Usage

```typescript
import { PrivateTransferComponent } from './components/private-transfer.component';

@Component({
  imports: [PrivateTransferComponent],
  template: '<app-private-transfer />'
})
export class AppComponent {}
```

## Features

- Angular 17+ signals for reactive state
- Standalone component (no module needed)
- FormsModule integration for two-way binding
- Full deposit → prove → withdraw flow
