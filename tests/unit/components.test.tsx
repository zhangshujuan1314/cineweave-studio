import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EmptyState from '../../src/renderer/components/EmptyState'

describe('EmptyState', () => {
  const props = { onNewProject: () => {}, onOpenProject: () => {}, appInfo: null as const, infoError: null as const }
  it('renders welcome', () => { render(<EmptyState {...props} />); expect(screen.getByText('Welcome to CineWeave Studio')).toBeInTheDocument() })
  it('renders buttons', () => {
    render(<EmptyState {...props} />)
    expect(screen.getByRole('button', { name: /new project/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open an existing project/i })).toBeInTheDocument()
  })
  it('displays app info', () => {
    render(<EmptyState {...props} appInfo={{ name:'T',version:'1.0.0',platform:'win32',arch:'x64',electronVersion:'33',nodeVersion:'20',chromeVersion:'130' }} />)
    expect(screen.getByText('v1.0.0')).toBeInTheDocument()
  })
  it('shows error', () => {
    render(<EmptyState {...props} infoError="fail" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load app info')
  })
  it('fires callbacks', async () => {
    let n = false, o = false
    render(<EmptyState {...props} onNewProject={()=>{n=true}} onOpenProject={()=>{o=true}} />)
    await userEvent.click(screen.getByRole('button', { name: /new project/i }))
    await userEvent.click(screen.getByRole('button', { name: /open an existing project/i }))
    expect(n).toBe(true); expect(o).toBe(true)
  })
})
