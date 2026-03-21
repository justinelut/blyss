'use client'

import { useState } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { Search } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import Button from '@/components/atoms/Button'
import Input from '@/components/atoms/Input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useSubscribeToNewsletter } from '@/hooks/queries/newsletter'
import { toast } from '@/components/Toast/use-toast'
import { setValidationErrors } from '@/utils/api/errors'

interface ContactFormData {
  name: string
  email: string
  subject: string
  message: string
}

interface NewsletterFormData {
  email: string
}

// FAQ data structure
const faqData = [
  {
    category: 'Getting Started',
    items: [
      {
        question: 'How do I create an account?',
        answer:
          'Click the "Sign Up" button in the top right corner. You can sign up using your email address or connect with your Google or GitHub account. Once registered, you can start browsing products and creating your own storefront.',
        keywords: ['account', 'sign up', 'register', 'create'],
      },
      {
        question: 'How do I purchase a product?',
        answer:
          'Browse products, click on one you like, and click "Add to Cart". Then go to your cart and click "Proceed to Checkout". You can pay using credit card, debit card, or M-Pesa.',
        keywords: ['purchase', 'buy', 'checkout', 'payment'],
      },
      {
        question: 'What payment methods do you accept?',
        answer:
          'We accept major credit cards (Visa, Mastercard, American Express), debit cards, and M-Pesa for Kenyan customers. All payments are processed securely through our payment partners.',
        keywords: ['payment', 'mpesa', 'credit card', 'debit card'],
      },
    ],
  },
  {
    category: 'For Creators',
    items: [
      {
        question: 'How do I become a creator?',
        answer:
          'After creating an account, go to your dashboard and click "Create Storefront". Fill in your creator profile information, add your products, and start selling. We review all creator applications to ensure quality.',
        keywords: ['creator', 'seller', 'storefront', 'sell'],
      },
      {
        question: 'What can I sell on Blyss?',
        answer:
          'You can sell digital products including digital art, templates, e-books, music, presets, and more. All products must be original work or properly licensed. Physical products are not currently supported.',
        keywords: ['sell', 'products', 'digital', 'art', 'templates'],
      },
      {
        question: 'How do I get paid?',
        answer:
          'Creators receive payments directly to their connected bank account or M-Pesa. Payouts are processed weekly. We charge a small platform fee to cover payment processing and platform maintenance.',
        keywords: ['payout', 'payment', 'earnings', 'money'],
      },
    ],
  },
  {
    category: 'Orders & Delivery',
    items: [
      {
        question: 'How do I access my purchased products?',
        answer:
          'After purchase, go to your Orders page in your account dashboard. You can download your digital products directly from there. Download links are also sent to your email.',
        keywords: ['download', 'access', 'orders', 'products'],
      },
      {
        question: 'Can I get a refund?',
        answer:
          'Due to the nature of digital products, refunds are handled on a case-by-case basis. If you experience issues with a product, contact the creator first. If unresolved, contact our support team within 14 days of purchase.',
        keywords: ['refund', 'return', 'money back'],
      },
      {
        question: 'What if my download link doesn\'t work?',
        answer:
          'Download links are valid for 30 days and can be used up to 5 times. If your link has expired or isn\'t working, go to your Orders page and request a new download link, or contact support.',
        keywords: ['download', 'link', 'expired', 'not working'],
      },
    ],
  },
  {
    category: 'Account & Security',
    items: [
      {
        question: 'How do I reset my password?',
        answer:
          'Click "Forgot Password" on the login page. Enter your email address and we\'ll send you a password reset link. Follow the instructions in the email to create a new password.',
        keywords: ['password', 'reset', 'forgot', 'login'],
      },
      {
        question: 'Is my payment information secure?',
        answer:
          'Yes. We use industry-standard encryption and never store your full payment details. All transactions are processed through PCI-compliant payment processors. We take security very seriously.',
        keywords: ['security', 'safe', 'payment', 'encryption'],
      },
      {
        question: 'How do I delete my account?',
        answer:
          'Go to Settings > Account > Delete Account. Please note that deleting your account is permanent and cannot be undone. All your data will be removed from our systems.',
        keywords: ['delete', 'remove', 'account', 'close'],
      },
    ],
  },
]

export default function HelpPageClient() {
  const [searchQuery, setSearchQuery] = useState('')
  const [contactLoading, setContactLoading] = useState(false)
  const [newsletterLoading, setNewsletterLoading] = useState(false)

  const contactForm = useForm<ContactFormData>()
  const newsletterForm = useForm<NewsletterFormData>()
  const subscribeToNewsletter = useSubscribeToNewsletter()

  // Filter FAQ items based on search query
  const filteredFaqData = faqData
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => {
        const query = searchQuery.toLowerCase()
        return (
          item.question.toLowerCase().includes(query) ||
          item.answer.toLowerCase().includes(query) ||
          item.keywords.some((keyword) => keyword.includes(query))
        )
      }),
    }))
    .filter((category) => category.items.length > 0)

  const onContactSubmit: SubmitHandler<ContactFormData> = async (data) => {
    setContactLoading(true)

    // Simulate API call - replace with actual API endpoint when available
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setContactLoading(false)
    toast({
      title: 'Message sent!',
      description: 'We\'ll get back to you within 24 hours.',
      variant: 'default',
    })
    contactForm.reset()
  }

  const onNewsletterSubmit: SubmitHandler<NewsletterFormData> = async ({
    email,
  }) => {
    setNewsletterLoading(true)

    // Note: The newsletter API requires organization_id, but for a general help page
    // we'll need to use a default organization or modify the API
    // For now, using a placeholder - this should be updated based on actual requirements
    const { error } = await subscribeToNewsletter.mutateAsync({
      email,
      organization_id: 'help-page', // This needs to be updated with actual org ID
    })

    setNewsletterLoading(false)

    if (error) {
      if (error.detail && Array.isArray(error.detail)) {
        setValidationErrors(error.detail, newsletterForm.setError)
      }
      toast({
        title: 'Subscription failed',
        description:
          typeof error.detail === 'string'
            ? error.detail
            : 'An error occurred. Please try again.',
        variant: 'destructive',
      })
      return
    }

    toast({
      title: 'Subscribed!',
      description: 'Check your email for confirmation.',
      variant: 'default',
    })
    newsletterForm.reset()
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-16 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl dark:text-white">
          Help Center
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-400">
          Find answers to common questions, learn about our community
          guidelines, and get support
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-12">
        <div className="relative mx-auto max-w-2xl">
          <Input
            type="text"
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            preSlot={<Search className="h-5 w-5" />}
            className="w-full"
          />
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mb-20">
        <h2 className="mb-8 text-3xl font-bold text-gray-900 dark:text-white">
          Frequently Asked Questions
        </h2>

        {filteredFaqData.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-800 dark:bg-gray-900">
            <p className="text-gray-600 dark:text-gray-400">
              No results found for "{searchQuery}". Try a different search term.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredFaqData.map((category) => (
              <div key={category.category}>
                <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
                  {category.category}
                </h3>
                <Accordion
                  type="single"
                  collapsible
                  className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                >
                  {category.items.map((item, index) => (
                    <AccordionItem
                      key={index}
                      value={`${category.category}-${index}`}
                      className="border-b border-gray-200 last:border-b-0 dark:border-gray-800"
                    >
                      <AccordionTrigger className="px-6 text-left text-base font-medium text-gray-900 hover:no-underline dark:text-white">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="px-6 text-gray-600 dark:text-gray-400">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Community Guidelines */}
      <div className="mb-20">
        <h2 className="mb-8 text-3xl font-bold text-gray-900 dark:text-white">
          Community Guidelines
        </h2>
        <div className="rounded-lg border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
          <div className="prose prose-gray max-w-none dark:prose-invert">
            <h3 className="text-xl font-semibold">Be Respectful</h3>
            <p>
              Treat all community members with respect. Harassment, hate speech,
              and discriminatory behavior are not tolerated.
            </p>

            <h3 className="mt-6 text-xl font-semibold">Original Content</h3>
            <p>
              Only upload content you own or have the rights to distribute.
              Respect intellectual property and give credit where it's due.
            </p>

            <h3 className="mt-6 text-xl font-semibold">Quality Standards</h3>
            <p>
              Maintain high-quality standards for your products. Provide
              accurate descriptions, preview images, and deliver what you
              promise.
            </p>

            <h3 className="mt-6 text-xl font-semibold">No Spam</h3>
            <p>
              Don't spam the platform with duplicate listings, excessive
              promotions, or irrelevant content.
            </p>

            <h3 className="mt-6 text-xl font-semibold">Report Issues</h3>
            <p>
              If you see content that violates our guidelines, please report it.
              We review all reports and take appropriate action.
            </p>
          </div>
        </div>
      </div>

      {/* Creator Resources */}
      <div className="mb-20">
        <h2 className="mb-8 text-3xl font-bold text-gray-900 dark:text-white">
          Creator Resources
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <a
            href="/docs/getting-started"
            className="group rounded-lg border border-gray-200 bg-white p-6 transition-colors hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
          >
            <h3 className="mb-2 text-lg font-semibold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
              Getting Started Guide
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Learn how to set up your storefront and upload your first product
            </p>
          </a>

          <a
            href="/docs/best-practices"
            className="group rounded-lg border border-gray-200 bg-white p-6 transition-colors hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
          >
            <h3 className="mb-2 text-lg font-semibold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
              Best Practices
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tips for creating compelling product listings and growing your
              audience
            </p>
          </a>

          <a
            href="/docs/pricing-guide"
            className="group rounded-lg border border-gray-200 bg-white p-6 transition-colors hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
          >
            <h3 className="mb-2 text-lg font-semibold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
              Pricing Guide
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Strategies for pricing your products competitively
            </p>
          </a>
        </div>
      </div>

      {/* Contact Form and Newsletter */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Contact Form */}
        <div>
          <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
            Contact Support
          </h2>
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <Form {...contactForm}>
              <form
                onSubmit={contactForm.handleSubmit(onContactSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={contactForm.control}
                  name="name"
                  rules={{ required: 'Name is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={contactForm.control}
                  name="email"
                  rules={{
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={contactForm.control}
                  name="subject"
                  rules={{ required: 'Subject is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="How can we help?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={contactForm.control}
                  name="message"
                  rules={{
                    required: 'Message is required',
                    minLength: {
                      value: 10,
                      message: 'Message must be at least 10 characters',
                    },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your issue or question..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  loading={contactLoading}
                  disabled={contactLoading}
                  fullWidth
                >
                  Send Message
                </Button>
              </form>
            </Form>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div>
          <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
            Stay Updated
          </h2>
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <p className="mb-6 text-gray-600 dark:text-gray-400">
              Subscribe to our newsletter for updates, tips, and exclusive
              offers.
            </p>
            <Form {...newsletterForm}>
              <form
                onSubmit={newsletterForm.handleSubmit(onNewsletterSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={newsletterForm.control}
                  name="email"
                  rules={{
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  loading={newsletterLoading}
                  disabled={newsletterLoading}
                  fullWidth
                >
                  Subscribe
                </Button>
              </form>
            </Form>

            <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-800">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                Other Ways to Reach Us
              </h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>Email: support@blyss.com</p>
                <p>Response time: Within 24 hours</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
