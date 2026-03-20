import { Preview, Text } from '@react-email/components'
import Footer from '../components/Footer'
import Intro from '../components/Intro'
import OTPCode from '../components/OTPCode'
import WrapperBlyss from '../components/WrapperBlyss'
import type { schemas } from '../types'

export function LoginCode({
  email,
  code,
  code_lifetime_minutes,
  domain,
}: schemas['LoginCodeProps']) {
  return (
    <WrapperBlyss>
      <Preview>
        Your code to sign in is {code}. It is valid for the next{' '}
        {code_lifetime_minutes.toFixed()} minutes.
      </Preview>
      <Intro>
        Here is your code to sign in to Blyss.{' '}
        <span className="font-bold">
          This code is only valid for the next {code_lifetime_minutes} minutes.
        </span>
      </Intro>
      <OTPCode code={code} domain={domain} />
      <Text className="text-gray-500">
        If you didn't request this email, you can safely ignore it.
      </Text>
      <Footer email={email} />
    </WrapperBlyss>
  )
}

LoginCode.PreviewProps = {
  email: 'john@example.com',
  code: 'ABC123',
  code_lifetime_minutes: 30,
  domain: 'blyss.co.ke',
}

export default LoginCode
