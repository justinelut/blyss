'use client'

import { useUpdateProfile } from '@/hooks/queries/creators'
import { setValidationErrors } from '@/utils/api/errors'
import { isValidationError, schemas } from '@polar-sh/client'
import Button from '@polar-sh/ui/components/atoms/Button'
import Input from '@polar-sh/ui/components/atoms/Input'
import TextArea from '@polar-sh/ui/components/atoms/TextArea'
import {
  Form,
  FormControl,
  FormField,
  FormMessage,
} from '@polar-sh/ui/components/ui/form'
import { useForm } from 'react-hook-form'
import { toast } from '../Toast/use-toast'

interface ProfileEditorProps {
  organization: schemas['Organization']
}

interface ProfileFormData {
  bio: string
  twitter: string
  instagram: string
  website: string
}

const URL_PATTERNS = {
  twitter: /^https:\/\/(twitter|x)\.com\/.+$/,
  instagram: /^https:\/\/instagram\.com\/.+$/,
  website: /^https?:\/\/.+$/,
}

export const ProfileEditor = ({ organization }: ProfileEditorProps) => {
  const updateProfile = useUpdateProfile(organization.id)

  const form = useForm<ProfileFormData>({
    defaultValues: {
      bio: organization.bio || '',
      twitter: organization.social_links?.twitter || '',
      instagram: organization.social_links?.instagram || '',
      website: organization.social_links?.website || '',
    },
  })

  const { handleSubmit, setError, formState } = form

  const onSubmit = async (data: ProfileFormData) => {
    const socialLinks: schemas['SocialLinks'] = {}

    if (data.twitter && data.twitter.trim() !== '') {
      if (!URL_PATTERNS.twitter.test(data.twitter)) {
        setError('twitter', {
          message: 'Twitter URL must start with https://twitter.com/ or https://x.com/',
        })
        return
      }
      socialLinks.twitter = data.twitter
    }

    if (data.instagram && data.instagram.trim() !== '') {
      if (!URL_PATTERNS.instagram.test(data.instagram)) {
        setError('instagram', {
          message: 'Instagram URL must start with https://instagram.com/',
        })
        return
      }
      socialLinks.instagram = data.instagram
    }

    if (data.website && data.website.trim() !== '') {
      if (!URL_PATTERNS.website.test(data.website)) {
        setError('website', {
          message: 'Website URL must start with http:// or https://',
        })
        return
      }
      socialLinks.website = data.website
    }

    const { data: result, error } = await updateProfile.mutateAsync({
      bio: data.bio || undefined,
      social_links: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
    })

    if (error) {
      const errorMessage = Array.isArray(error.detail)
        ? error.detail[0]?.msg || 'An error occurred while updating the profile'
        : typeof error.detail === 'string'
          ? error.detail
          : 'An error occurred while updating the profile'

      if (isValidationError(error.detail)) {
        setValidationErrors(error.detail, setError)
      } else {
        setError('root', { message: errorMessage })
      }

      toast({
        title: 'Profile Update Failed',
        description: errorMessage,
        variant: 'destructive',
      })

      return
    }

    toast({
      title: 'Profile Updated',
      description: 'Your creator profile has been updated successfully',
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
              <label className="mb-2 block text-sm font-medium">Bio</label>
              <FormControl>
                <TextArea
                  {...field}
                  rows={4}
                  placeholder="Tell visitors about yourself and your work..."
                  className="resize-none"
                />
              </FormControl>
              <div className="mt-1 flex items-center justify-between">
                <FormMessage />
                <span className="text-xs text-gray-500">
                  {field.value?.length || 0}/500 characters
                </span>
              </div>
            </div>
          )}
        />

        <div className="space-y-4">
          <h3 className="text-sm font-medium">Social Links</h3>

          <FormField
            control={form.control}
            name="twitter"
            render={({ field }) => (
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Twitter / X URL
                </label>
                <FormControl>
                  <Input
                    {...field}
                    type="url"
                    placeholder="https://twitter.com/username"
                  />
                </FormControl>
                <FormMessage />
              </div>
            )}
          />

          <FormField
            control={form.control}
            name="instagram"
            render={({ field }) => (
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Instagram URL
                </label>
                <FormControl>
                  <Input
                    {...field}
                    type="url"
                    placeholder="https://instagram.com/username"
                  />
                </FormControl>
                <FormMessage />
              </div>
            )}
          />

          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Website URL
                </label>
                <FormControl>
                  <Input
                    {...field}
                    type="url"
                    placeholder="https://example.com"
                  />
                </FormControl>
                <FormMessage />
              </div>
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!formState.isDirty || updateProfile.isPending}
            loading={updateProfile.isPending}
          >
            Save Profile
          </Button>
        </div>
      </form>
    </Form>
  )
}
