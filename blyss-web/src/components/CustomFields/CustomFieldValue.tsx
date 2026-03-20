import CheckOutlined from '@mui/icons-material/CheckOutlined'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import { schemas } from '@/lib/api'
import FormattedDateTime from '@/components/atoms/FormattedDateTime'
import TextArea from '@/components/atoms/TextArea'

const numberFormat = new Intl.NumberFormat(undefined, {})

const CustomFieldValue = ({
  field,
  value,
}: {
  field: schemas['CustomField']
  value: string | number | boolean | undefined | null
}) => {
  if (value === undefined || value === null) {
    return '—'
  }

  switch (field.type) {
    case 'text':
      return <TextArea className="text-xs" value={`${value}`} readOnly />
    case 'number':
      return numberFormat.format(value as number)
    case 'date':
      return <FormattedDateTime datetime={value as string} />
    case 'checkbox':
      return value === true ? (
        <CheckOutlined fontSize="inherit" />
      ) : (
        <CloseOutlined fontSize="inherit" />
      )
    case 'select':
      // eslint-disable-next-line no-case-declarations
      const option = field.properties.options.find(
        (option) => option.value === value,
      )
      return option ? option.label : value
  }
}

export default CustomFieldValue
