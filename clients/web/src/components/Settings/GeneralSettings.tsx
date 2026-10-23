'use client'

import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined'
import Button from '@/components/atoms/Button'
import ShadowListGroup from '@/components/atoms/ShadowListGroup'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCallback } from 'react'
import { useTheme } from 'next-themes'
import Spinner from '../Shared/Spinner'
export type Theme = 'system' | 'light' | 'dark'

interface GeneralSettingsProps {
  returnTo?: string
}

const GeneralSettings: React.FC<GeneralSettingsProps> = () => {
  const { theme, setTheme } = useTheme()

  const handleThemeChange = useCallback(
    (nextTheme: Theme) => () => setTheme(nextTheme),
    [setTheme],
  )

  return (
    <ShadowListGroup>
      <ShadowListGroup.Item>
        <div className="flex flex-row items-start justify-between">
          <div className="flex flex-col gap-y-1">
            <h3>Theme</h3>
            <p className="dark:text-polar-500 text-sm text-[var(--text-muted)]">
              Override your browser&apos;s preferred theme settings
            </p>
          </div>
          {theme === undefined ? (
            <Spinner />
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="justify-between" variant="secondary">
                  <span className="capitalize">{theme}</span>
                  <ExpandMoreOutlined className="ml-2" fontSize="small" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="dark:bg-polar-800 bg-[var(--surface)] shadow-lg"
                align="end"
              >
                <DropdownMenuItem onClick={handleThemeChange('system')}>
                  <span>System</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleThemeChange('light')}>
                  <span>Light</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleThemeChange('dark')}>
                  <span>Dark</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </ShadowListGroup.Item>
    </ShadowListGroup>
  )
}

export default GeneralSettings
