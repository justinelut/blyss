import { Img, Section } from '@react-email/components'

interface HeaderProps {}

const Header = () => (
  <Section>
    <div className="relative h-[48px]">
      <Img
        alt="Blyss"
        height="48"
        width="48"
        src="https://blyss.co.ke/blyss-email-logo.png"
      />
    </div>
  </Section>
)

export default Header
