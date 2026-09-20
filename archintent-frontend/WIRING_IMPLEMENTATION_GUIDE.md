# ArchIntent Frontend Wiring Implementation Guide

This guide provides complete instructions for implementing proper error handling, loading states, and user feedback across all frontend pages.

## What's Been Completed ✅

### Infrastructure
- ✅ `react-hot-toast` installed and configured in `App.tsx`
- ✅ Axios interceptor with comprehensive error handling
- ✅ Reusable UI components: `SkeletonLoader`, `ErrorState`, `EmptyState`, `FormSubmitButton`
- ✅ Pending verification page for architect/contractor accounts

### Pages Updated
- ✅ LoginPage
- ✅ RegisterPage  
- ✅ HomePage
- ✅ NotFoundPage
- ✅ ArchitectsBrowse
- ✅ ArchitectDashboard
- ✅ ClientDashboard
- ✅ ContractorDashboard
- ✅ MyProjects
- ✅ CreateProject
- ✅ ProjectDetail
- ✅ ConstructionJobs

## Pattern Templates

### For Data-Fetching Pages

**Step 1: Add imports**
```typescript
import SkeletonLoader from '../components/SkeletonLoader';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import axiosInstance from '../api/axios';
```

**Step 2: Add document title and loading states**
```typescript
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
const [data, setData] = useState<DataType[]>([]);

useEffect(() => {
  document.title = 'Page Name — ArchIntent';
  fetchData();
}, []);
```

**Step 3: Create fetch function with error handling**
```typescript
const fetchData = async () => {
  try {
    setLoading(true);
    setError('');
    const response = await axiosInstance.get('/endpoint');
    setData(response.data);
  } catch (err: any) {
    const errorMessage = err.response?.data?.message || 'Failed to load data';
    setError(errorMessage);
  } finally {
    setLoading(false);
  }
};
```

**Step 4: Add conditional rendering**
```typescript
if (loading) {
  return <SkeletonLoader type="grid" count={6} />;
}

if (error) {
  return <ErrorState message={error} onRetry={fetchData} showButton={true} />;
}

if (data.length === 0) {
  return (
    <EmptyState
      title="No items found"
      message="There are no items to display yet"
      showButton={false}
    />
  );
}

// Render normal content
return (
  <div>
    {/* Your content here */}
  </div>
);
```

### For Form Pages

**Step 1: Add imports**
```typescript
import FormSubmitButton from '../components/FormSubmitButton';
import toast from 'react-hot-toast';
```

**Step 2: Add loading and error states**
```typescript
const [formData, setFormData] = useState<FormDataType>({...});
const [errors, setErrors] = useState<FormErrors>({});
const [loading, setLoading] = useState(false);
const [apiError, setApiError] = useState('');

useEffect(() => {
  document.title = 'Form Title — ArchIntent';
}, []);
```

**Step 3: Add submit handler with error handling**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setApiError('');

  if (!validateForm()) return;

  setLoading(true);

  try {
    const response = await axiosInstance.post('/endpoint', formData);
    
    if (response.data.data) {
      toast.success('Action completed successfully!');
      // Redirect or reset form
      navigate('/success-route');
    }
  } catch (error: any) {
    if (error.response?.data?.errors) {
      // Validation errors - show on form fields
      setErrors(error.response.data.errors);
    } else {
      // Toast is shown automatically by interceptor
      // No need to show here
    }
  } finally {
    setLoading(false);
  }
};
```

**Step 4: Disable inputs and show loading state**
```typescript
<input
  disabled={loading}
  // ... other props
/>

<FormSubmitButton
  loading={loading}
  label="Submit"
  disabled={isFormInvalid}
/>
```

## Axios Interceptor Features (Already Implemented)

The axios interceptor in `src/api/axios.ts` handles:

- **401 Unauthorized**: Clears localStorage, redirects to `/login`
- **403 Forbidden**: Shows toast "You don't have permission"
- **422 Unprocessable Entity**: Returns validation errors (for forms)
- **500 Internal Server Error**: Shows toast "Server error. Please try again."
- **Generic errors**: Shows toast with error message

## Skeleton Loader Types

```typescript
<SkeletonLoader type="grid" count={6} />      // Grid of cards
<SkeletonLoader type="list" count={5} />      // List items
<SkeletonLoader type="card" count={3} />      // Stacked cards
<SkeletonLoader type="form" count={4} />      // Form fields
<SkeletonLoader type="table" count={5} />     // Table rows
```

## Pages Still Needing Updates

### Detail/View Pages (Add document.title + skeleton loader + error state):
- [ ] ArchitectDetail.tsx
- [ ] ArchitectPortfolio.tsx
- [ ] ContractorPortfolio.tsx
- [ ] ConstructionJobDetail.tsx
- [ ] ProjectAgreement.tsx
- [ ] MatchedArchitects.tsx

### Profile/Settings Pages (Add document.title + loading spinner):
- [ ] ArchitectProfile.tsx
- [ ] ContractorProfile.tsx

### Admin Pages (Add document.title + skeleton loader + error state):
- [ ] AdminDashboard.tsx
- [ ] AdminUsers.tsx
- [ ] AdminVerifyArchitects.tsx
- [ ] AdminVerifyContractors.tsx
- [ ] AdminAnalytics.tsx
- [ ] AdminLogs.tsx

## Best Practices

### 1. Always use `axiosInstance` not `axios`
```typescript
// ✅ Good
import axiosInstance from '../api/axios';
const response = await axiosInstance.get('/endpoint');

// ❌ Bad
import axios from 'axios';
const response = await axios.get('/endpoint');
```

### 2. Set document.title on every page
```typescript
useEffect(() => {
  document.title = 'Page Name — ArchIntent';
}, []);
```

### 3. Provide error context in messages
```typescript
// ✅ Good
setError('Failed to load architects. Please try again.');

// ❌ Bad
setError('Error');
```

### 4. Use toast for successful operations
```typescript
toast.success('Project created successfully!');
```

### 5. Show skeleton loaders matching page layout
```typescript
// ✅ Grid of items
if (loading) return <SkeletonLoader type="grid" count={6} />;

// ✅ List of items
if (loading) return <SkeletonLoader type="list" count={5} />;
```

## Testing Checklist

For each page verify:

- [ ] Loading state shows while fetching
- [ ] Error state appears and retry button works
- [ ] Empty state shows appropriate message
- [ ] Document title updates
- [ ] Toast notifications appear on success
- [ ] Toast notifications appear on error (from interceptor)
- [ ] Form inputs disabled during submission
- [ ] Submit button shows loading spinner
- [ ] No double-submit possible
- [ ] 401 redirects to login
- [ ] 403 shows permission error
- [ ] 422 displays field validation errors

## Common Implementation Issues

### Issue: Validation errors not showing
**Solution**: Check that error response status is 422, and handle errors object:
```typescript
if (error.response?.status === 422) {
  setErrors(error.response.data.errors);
}
```

### Issue: Double submissions
**Solution**: Disabled form during submission:
```typescript
<button disabled={loading}>Submit</button>
```

### Issue: Skeleton loader doesn't match content
**Solution**: Use correct type parameter:
```typescript
// Use 'grid' for card layouts
// Use 'list' for list layouts
// Use 'form' for form pages
```

### Issue: Toast notifications not appearing
**Solution**: Verify Toaster is in App.tsx and using axiosInstance:
```typescript
// App.tsx
<Toaster position="top-right" />

// Pages
import axiosInstance from '../api/axios'; // Not axios
```

## File Structure Reference

```
src/
├── components/
│   ├── SkeletonLoader.tsx
│   ├── ErrorState.tsx
│   ├── EmptyState.tsx
│   ├── FormSubmitButton.tsx
│   └── ProtectedRoute.tsx
├── api/
│   └── axios.ts
├── pages/
│   ├── LoginPage.tsx              ✅
│   ├── RegisterPage.tsx           ✅
│   ├── HomePage.tsx               ✅
│   ├── NotFoundPage.tsx           ✅
│   ├── ArchitectsBrowse.tsx       ✅
│   ├── ArchitectDetail.tsx        ⏳
│   ├── ArchitectDashboard.tsx     ✅
│   ├── ClientDashboard.tsx        ✅
│   ├── ContractorDashboard.tsx    ✅
│   ├── MyProjects.tsx             ✅
│   ├── CreateProject.tsx          ✅
│   ├── ProjectDetail.tsx          ✅
│   ├── ConstructionJobs.tsx       ✅
│   └── ...
├── App.tsx                         ✅
└── main.tsx
```

## Next Steps

1. Install dependencies: `npm install react-hot-toast`
2. Test each updated page for proper wiring
3. Apply patterns to remaining pages using templates above
4. Test error scenarios (network failure, 401, 403, validation errors)
5. Verify all toast notifications appear correctly
