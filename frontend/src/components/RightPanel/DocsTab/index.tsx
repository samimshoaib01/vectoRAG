import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import { Section } from '../../ui/primitives'
import { DocList } from './DocList'
import { InsertDocument } from './InsertDocument'
import { OllamaStatusCard } from './OllamaStatusCard'

export function DocsTab() {
  const statusQ = useQuery({
    queryKey: ['status'],
    queryFn: api.getStatus,
    refetchInterval: 10_000,
  })
  const docCount = statusQ.data?.docCount ?? 0

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
      <Section title="Ollama Status">
        <OllamaStatusCard data={statusQ.data} isLoading={statusQ.isLoading} />
      </Section>

      <Section title="Insert Document">
        <InsertDocument />
      </Section>

      <Section
        title={
          <>
            Stored Documents (<span className="text-text">{docCount}</span>)
          </>
        }
      >
        <DocList />
      </Section>
    </div>
  )
}
