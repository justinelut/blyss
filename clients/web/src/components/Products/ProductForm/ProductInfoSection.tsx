'use client'

import { Section } from '@/components/Layout/Section'
import Input from '@/components/atoms/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/Select'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useCategories } from '@/hooks/queries/categories'
import { useFormContext } from 'react-hook-form'
import { ProductFormType } from './ProductForm'

export interface ProductInfoSectionProps {
  className?: string
  compact?: boolean
}

const NO_CATEGORY = '__none__'

export const ProductInfoSection = ({
  className,
  compact,
}: ProductInfoSectionProps) => {
  const { control } = useFormContext<ProductFormType>()
  const { data: categoriesResource } = useCategories()
  const categories =
    (categoriesResource as { items?: { id: string; name: string }[] } | undefined)
      ?.items ?? []

  return (
    <Section
      title="Product"
      description="Basic product information"
      className={className}
      compact={compact}
    >
      <div className="flex w-full flex-col gap-y-6">
        <FormField
          control={control}
          name="name"
          rules={{
            required: 'This field is required',
            minLength: 3,
            maxLength: 64,
          }}
          defaultValue=""
          render={({ field }) => (
            <FormItem>
              <div className="flex flex-row items-center justify-between">
                <FormLabel>Name</FormLabel>
              </div>
              <FormControl>
                <Input {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category picker — single-select. Backed by /v1/categories/.
            Form holds the slug-or-empty value off-band of ProductCreate;
            submit handler in CreateProductPage / EditProductPage syncs
            via POST/DELETE /v1/categories/assignments after the product
            row is saved. Empty string === uncategorised. */}
        <FormField
          control={control}
          name={'category_id' as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <Select
                  value={(field.value as string) || NO_CATEGORY}
                  onValueChange={(v) =>
                    field.onChange(v === NO_CATEGORY ? '' : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>Uncategorised</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>
                Where buyers will discover this product on /categories.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Section>
  )
}
