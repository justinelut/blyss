'use client'

import { schemas } from '@/lib/api'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/atoms/Accordion'
import TextArea from '@/components/atoms/TextArea'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { twMerge } from 'tailwind-merge'
import ProductMediasField from '../ProductMediasField'
import { ProductCustomFieldSection } from './ProductCustomFieldSection'
import { ProductFormType } from './ProductForm'

export const ProductCheckoutSection = ({
  className,
  organization,
}: {
  className?: string
  organization: schemas['Organization']
}) => {
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext<ProductFormType>()
  const isRecurring = !!watch('is_recurring' as any)
  const visibility = watch('visibility') ?? 'public'
  const [openSection, setOpenSection] = useState('')

  useEffect(() => {
    if (errors.full_medias) {
      setOpenSection('checkout-page')
    }
  }, [errors.full_medias])

  return (
    <div
      className={twMerge(
        'flex flex-col gap-6 p-5 sm:gap-8 sm:p-8 md:gap-12 md:p-12',
        className,
      )}
    >
      <Accordion
        type="single"
        collapsible
        value={openSection}
        onValueChange={setOpenSection}
      >
        <AccordionItem value="checkout-page" className="border-none">
          <AccordionTrigger className="cursor-pointer hover:no-underline">
            <div className="flex flex-col items-start gap-y-2 text-left">
              <h2 className="text-lg font-medium">Checkout Page</h2>
              <p className="dark:text-polar-500 text-sm leading-snug font-normal text-gray-500">
                Customize how this product is presented during checkout
              </p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-8">
            <div className="flex w-full flex-col gap-y-6">
              <FormField
                control={control}
                name="description"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-2">
                    <div className="flex flex-row items-center justify-between">
                      <FormLabel>Description</FormLabel>
                      <p className="dark:text-polar-500 text-sm text-gray-500">
                        Markdown format
                      </p>
                    </div>
                    <FormControl>
                      <TextArea
                        className="min-h-44 resize-none rounded-2xl font-mono text-xs!"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="full_medias"
                rules={{
                  validate: (medias) =>
                    visibility !== 'public' ||
                    (medias?.length ?? 0) > 0 ||
                    'Add at least one image before making this product public.',
                }}
                render={({ field }) => (
                  <FormItem className="flex w-full flex-col gap-2">
                    <div className="flex flex-row items-center justify-between">
                      <FormLabel>
                        Product images{' '}
                        <span className="font-normal text-gray-500 dark:text-polar-500">
                          (featured image required for public products)
                        </span>
                      </FormLabel>
                    </div>

                    <FormDescription>
                      Add at least one image for a public product. The first
                      image is shown as its featured image on checkout and
                      product listings.
                    </FormDescription>

                    <FormControl>
                      <ProductMediasField
                        organization={organization}
                        value={field.value}
                        onChange={field.onChange}
                        isRecurring={isRecurring}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-2">
                <div className="flex flex-row items-center justify-between">
                  <FormLabel>Checkout Fields</FormLabel>
                  <p className="dark:text-polar-500 text-sm text-gray-500">
                    <Link
                      className="text-blue-500 hover:underline"
                      href={`/dashboard/${organization.slug}/settings/custom-fields`}
                      target="_blank"
                    >
                      Manage Custom Fields
                    </Link>
                  </p>
                </div>

                <ProductCustomFieldSection organization={organization} />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
