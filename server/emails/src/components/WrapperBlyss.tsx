import { Container } from '@react-email/components'
import BlyssHeader from './BlyssHeader'
import WrapperBase from './WrapperBase'

const WrapperBlyss = ({ children }: { children: React.ReactNode }) => {
  return (
    <WrapperBase>
      <Container className="px-[12px] pt-[20px] pb-[10px]">
        <BlyssHeader />
      </Container>
      <Container className="px-[20px] pt-[10px] pb-[20px]">
        {children}
      </Container>
    </WrapperBase>
  )
}

export default WrapperBlyss
