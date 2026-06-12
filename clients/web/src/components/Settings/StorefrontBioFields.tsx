'use client'

/**
 * StorefrontBioFields — bio + creator category editor for the
 * dashboard organization settings page.
 *
 * Why this exists:
 * - The public creator storefront (`/creators/{slug}`) renders
 *   `organization.bio` directly. Without it the page reads as an
 *   unfinished shell — buyers don't trust unfinished stores.
 * - The existing `OrganizationProfileSettings` form binds to
 *   `OrganizationUpdate`, which on the backend is a different
 *   schema that does NOT include `bio`. Bio lives on
 *   `ProfileUpdateSchema` and goes through
 *   `PATCH /v1/organizations/{id}/profile`.
 * - Until this component, there was simply no UI exposing the bio
 *   field — the column existed in the schema and the public site
 *   read it, but no dashboard input wrote to it.
 *
 * We deliberately do NOT include social links here — those are
 * already covered by the parent `OrganizationProfileSettings` via
 * the `socials` list. Adding them again here would create a
 * confusing two-source-of-truth UX.
 */

import { useCreatorCategories, useUpdateProfile } from '@/hooks/queries/creators'
import { setValidationErrors } from '@/utils/api/errors'
import { isValidationError, schemas } from '@/lib/api'
import Button from '@/components/atoms/Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/Select'
import TextArea from '@/components/atoms/TextArea'
import {
  Form,
  FormControl,
  FormField,
  FormMessage,
} from '@/components/ui/form'
import { useForm } from 'react-hook-form'
import { toast } from '../Toast/use-toast'

interface StorefrontBioFieldsProps {
  organization: schemas['Organization']
}

interface BioFormData {
  bio: string
  creator_category: string
}

export const StorefrontBioFields = ({
  organization,
}: StorefrontBioFieldsProps) => {
  const updateProfile = useUpdateProfile(organization.id)
  const { data: categories = [] } = useCreatorCategories()

  const form = useForm<BioFormData>({
    defaultValues: {
      bio:
        (organization as unknown as { bio?: string | null }).bio || '',
      creator_category:
        (organization as unknown as { creator_category?: string })
          .creator_category || '',
    },
  })

  const { handleSubmit, setError, formState, reset } = form

  const onSubmit = async (data: BioFormData) => {
    const { data: result, error } = await updateProfile.mutateAsync({
      bio: data.bio?.trim() ? data.bio : null,
      // Always send the category — empty string clears it server-side.
      creator_category: data.creator_category ?? '',
    } as schemas['ProfileUpdateSchema'])

    if (error) {
      const errorMessage = Array.isArray(error.detail)
        ? error.detail[0]?.msg ||
          'An error occurred while updating the profile'
        : typeof error.detail === 'string'
          ? error.detail
          : 'An error occurred while updating the profile'

      if (isValidationError(error.detail)) {
        setValidationErrors(error.detail, setError)
      } else {
        setError('root', { message: errorMessage })
      }

      toast({
        title: 'Bio update failed',
        description: errorMessage,
      })

      return
    }

    // Reset the dirty state with the values just persisted so the
    // Save button disables again until the next edit.
    const persisted = result as unknown as {
      bio?: string | null
      creator_category?: string
    } | null
    reset(
      {
        bio: persisted?.bio ?? '',
        creator_category:
          persisted?.creator_category ?? data.creator_category,
      },
      { keepDirty: false },
    )

    toast({
      title: 'Storefront updated',
      description: 'Bio and category saved.',
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="bio"
          rules={{
            maxLength: {
              value: 500,
              message: 'Bio must be 500 characters or less',
            },
          }}
          render={({ field }) => (
            <div>
              <label className="mb-2 block text-sm font-medium">
                Bio
              </label>
              <p className="mb-2 text-xs text-[var(--text-muted)]">
                Shown on your public creator page above the fold.
                Tell buyers who you are, what you make, and how
                long you&apos;ve been doing it. 2 to 4 sentences
                is the sweet spot.
              </p>
              <FormControl>
                <TextArea
                  {...field}
                  rows={4}
                  placeholder="I make Lightroom presets for Nairobi street photographers. Started in 2022, three packs out so far."
                  className="resize-none"
                />
              </FormControl>
              <div className="mt-1 flex items-center justify-between">
                <FormMessage />
                <span className="text-xs text-[var(--text-muted)]">
                  {field.value?.length || 0}/500 characters
                </span>
              </div>
            </div>
          )}
        />

        <FormField
          control={form.control}
          name="creator_category"
          render={({ field }) => (
            <div>
              <label className="mb-2 block text-sm font-medium">
                Category
              </label>
              <p className="mb-2 text-xs text-[var(--text-muted)]">
                Picks the section your storefront shows up in on
                the public /creators directory. Pick the one that
                matches what you sell most.
              </p>
              <FormControl>
                <Select
                  value={field.value || '__none__'}
                  onValueChange={(v) =>
                    field.onChange(v === '__none__' ? '' : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      No category
                    </SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.slug}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </div>
          )}
        />

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!formState.isDirty || updateProfile.isPending}
            loading={updateProfile.isPending}
          >
            Save bio
          </Button>
        </div>
      </form>
    </Form>
  )
}
