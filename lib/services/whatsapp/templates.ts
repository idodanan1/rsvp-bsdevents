import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

type Template = Database['public']['Tables']['message_templates']['Row']

export class TemplateManager {
  private supabase: any

  constructor(supabase: any) {
    this.supabase = supabase
  }

  async getTemplates(userId: string) {
    const { data, error } = await this.supabase
      .from('message_templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return data || []
  }

  async createTemplate(
    userId: string,
    name: string,
    content: string,
    type: Template['type'],
    templateId?: string,
    variables?: any
  ) {
    const { data, error } = await this.supabase
      .from('message_templates')
      .insert({
        user_id: userId,
        name,
        content,
        type,
        template_id: templateId,
        variables: variables || null,
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  async updateTemplate(id: string, updates: Partial<Template>) {
    const { data, error } = await this.supabase
      .from('message_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  async deleteTemplate(id: string) {
    const { error } = await this.supabase
      .from('message_templates')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  }
}

