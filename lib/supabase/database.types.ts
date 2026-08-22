export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          is_active: boolean
          is_super_admin: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          is_active?: boolean
          is_super_admin?: boolean
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          is_active?: boolean
          is_super_admin?: boolean
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          logo_path: string | null
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          logo_path?: string | null
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          logo_path?: string | null
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          campaign_type: string
          created_at: string
          description: string
          discount_type: string
          discount_value: number
          ends_at: string | null
          headline: string
          id: string
          is_active: boolean
          is_featured: boolean
          metadata: Json
          minimum_order_total: number
          name: string
          slug: string
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          campaign_type?: string
          created_at?: string
          description?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          headline?: string
          id?: string
          is_active?: boolean
          is_featured?: boolean
          metadata?: Json
          minimum_order_total?: number
          name: string
          slug: string
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          campaign_type?: string
          created_at?: string
          description?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          headline?: string
          id?: string
          is_active?: boolean
          is_featured?: boolean
          metadata?: Json
          minimum_order_total?: number
          name?: string
          slug?: string
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          is_active: boolean
          maximum_discount: number | null
          minimum_order_total: number
          stackable: boolean
          starts_at: string | null
          title: string
          updated_at: string
          usage_count: number
          usage_limit: number | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          maximum_discount?: number | null
          minimum_order_total?: number
          stackable?: boolean
          starts_at?: string | null
          title: string
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          maximum_discount?: number | null
          minimum_order_total?: number
          stackable?: boolean
          starts_at?: string | null
          title?: string
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          address_line: string
          city: string
          created_at: string
          district: string
          full_name: string
          id: string
          is_default: boolean
          label: string
          neighborhood: string
          phone: string
          postal_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line?: string
          city?: string
          created_at?: string
          district?: string
          full_name?: string
          id?: string
          is_default?: boolean
          label?: string
          neighborhood?: string
          phone?: string
          postal_code?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line?: string
          city?: string
          created_at?: string
          district?: string
          full_name?: string
          id?: string
          is_default?: boolean
          label?: string
          neighborhood?: string
          phone?: string
          postal_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_favorites: {
        Row: {
          created_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_inquiries: {
        Row: {
          admin_note: string
          created_at: string
          email: string
          full_name: string
          id: string
          location: string
          message: string
          metadata: Json
          phone: string
          product_id: string | null
          product_title: string
          services: string[]
          source: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          admin_note?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          location?: string
          message?: string
          metadata?: Json
          phone?: string
          product_id?: string | null
          product_title?: string
          services?: string[]
          source?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          location?: string
          message?: string
          metadata?: Json
          phone?: string
          product_id?: string | null
          product_title?: string
          services?: string[]
          source?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_inquiries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_profiles: {
        Row: {
          admin_note: string
          created_at: string
          email: string
          email_verified_at: string | null
          full_name: string
          is_blocked: boolean
          is_vip: boolean
          marketing_consent: boolean
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string
          created_at?: string
          email: string
          email_verified_at?: string | null
          full_name?: string
          is_blocked?: boolean
          is_vip?: boolean
          marketing_consent?: boolean
          phone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string
          created_at?: string
          email?: string
          email_verified_at?: string | null
          full_name?: string
          is_blocked?: boolean
          is_vip?: boolean
          marketing_consent?: boolean
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          error_message: string
          id: string
          metadata: Json
          recipient_email: string
          status: string
          subject: string
          template_key: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string
          id?: string
          metadata?: Json
          recipient_email?: string
          status?: string
          subject?: string
          template_key?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string
          id?: string
          metadata?: Json
          recipient_email?: string
          status?: string
          subject?: string
          template_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_template_key_fkey"
            columns: ["template_key"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["key"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string
          description: string
          html_body: string
          is_enabled: boolean
          key: string
          name: string
          preheader: string
          subject: string
          text_body: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          html_body: string
          is_enabled?: boolean
          key: string
          name: string
          preheader?: string
          subject: string
          text_body?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          html_body?: string
          is_enabled?: boolean
          key?: string
          name?: string
          preheader?: string
          subject?: string
          text_body?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_verification_tokens: {
        Row: {
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          token_hash: string
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          token_hash: string
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      home_slides: {
        Row: {
          alt_text: string
          created_at: string
          href: string
          id: string
          image_path: string
          is_active: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          alt_text?: string
          created_at?: string
          href?: string
          id?: string
          image_path: string
          is_active?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          alt_text?: string
          created_at?: string
          href?: string
          id?: string
          image_path?: string
          is_active?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      home_video_settings: {
        Row: {
          created_at: string
          description: string
          eyebrow: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
          video_id: string
          video_url: string
        }
        Insert: {
          created_at?: string
          description?: string
          eyebrow?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          video_id: string
          video_url: string
        }
        Update: {
          created_at?: string
          description?: string
          eyebrow?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          video_id?: string
          video_url?: string
        }
        Relationships: []
      }
      project_references: {
        Row: {
          completed_at: string | null
          created_at: string
          customer_name: string
          description: string
          id: string
          image_alt: string
          image_path: string | null
          is_active: boolean
          is_featured: boolean
          location: string
          service_type: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          customer_name?: string
          description?: string
          id?: string
          image_alt?: string
          image_path?: string | null
          is_active?: boolean
          is_featured?: boolean
          location?: string
          service_type?: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          customer_name?: string
          description?: string
          id?: string
          image_alt?: string
          image_path?: string | null
          is_active?: boolean
          is_featured?: boolean
          location?: string
          service_type?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          order_id: string
          product_id: string | null
          product_image_url: string
          product_slug: string
          product_title: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          line_total?: number
          order_id: string
          product_id?: string | null
          product_image_url?: string
          product_slug?: string
          product_title: string
          quantity: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string | null
          product_image_url?: string
          product_slug?: string
          product_title?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_note: string
          billing_address: Json
          campaign_id: string | null
          checkout_idempotency_key: string | null
          coupon_code: string | null
          coupon_id: string | null
          created_at: string
          currency: string
          customer_email: string
          customer_name: string
          customer_phone: string
          discount_total: number
          id: string
          note: string
          order_number: string
          payment_method_id: string | null
          payment_provider: Database["public"]["Enums"]["payment_provider"]
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          risk_approved_at: string | null
          risk_approved_by: string | null
          risk_decision: string
          risk_snapshot: Json
          shipping_address: Json
          shipping_total: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string
          billing_address?: Json
          campaign_id?: string | null
          checkout_idempotency_key?: string | null
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          discount_total?: number
          id?: string
          note?: string
          order_number?: string
          payment_method_id?: string | null
          payment_provider?: Database["public"]["Enums"]["payment_provider"]
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          risk_approved_at?: string | null
          risk_approved_by?: string | null
          risk_decision?: string
          risk_snapshot?: Json
          shipping_address?: Json
          shipping_total?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string
          billing_address?: Json
          campaign_id?: string | null
          checkout_idempotency_key?: string | null
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          discount_total?: number
          id?: string
          note?: string
          order_number?: string
          payment_method_id?: string | null
          payment_provider?: Database["public"]["Enums"]["payment_provider"]
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          risk_approved_at?: string | null
          risk_approved_by?: string | null
          risk_decision?: string
          risk_snapshot?: Json
          shipping_address?: Json
          shipping_total?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_attempts: {
        Row: {
          amount: number
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          metadata: Json
          order_id: string
          payment_method_id: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          metadata?: Json
          order_id: string
          payment_method_id?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          metadata?: Json
          order_id?: string
          payment_method_id?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_attempts_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          code: string
          config: Json
          created_at: string
          description: string
          id: string
          instructions: string
          integration_type: string
          is_active: boolean
          name: string
          provider: Database["public"]["Enums"]["payment_provider"]
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          config?: Json
          created_at?: string
          description?: string
          id?: string
          instructions?: string
          integration_type?: string
          is_active?: boolean
          name: string
          provider?: Database["public"]["Enums"]["payment_provider"]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          config?: Json
          created_at?: string
          description?: string
          id?: string
          instructions?: string
          integration_type?: string
          is_active?: boolean
          name?: string
          provider?: Database["public"]["Enums"]["payment_provider"]
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_attributes: {
        Row: {
          attribute_group: string
          created_at: string
          id: string
          name: string
          product_id: string
          sort_order: number
          value: string
        }
        Insert: {
          attribute_group?: string
          created_at?: string
          id?: string
          name: string
          product_id: string
          sort_order?: number
          value?: string
        }
        Update: {
          attribute_group?: string
          created_at?: string
          id?: string
          name?: string
          product_id?: string
          sort_order?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          category_id: string
          created_at: string
          is_primary: boolean
          product_id: string
          sort_order: number
        }
        Insert: {
          category_id: string
          created_at?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_highlights: {
        Row: {
          content: string
          created_at: string
          id: string
          product_id: string
          sort_order: number
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_highlights_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_pages: {
        Row: {
          content_html: string
          created_at: string
          id: string
          is_published: boolean
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort_order: number
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          content_html?: string
          created_at?: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number
          summary?: string
          title: string
          updated_at?: string
        }
        Update: {
          content_html?: string
          created_at?: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt_text: string
          caption: string
          created_at: string
          id: string
          is_featured: boolean
          product_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          alt_text?: string
          caption?: string
          created_at?: string
          id?: string
          is_featured?: boolean
          product_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          alt_text?: string
          caption?: string
          created_at?: string
          id?: string
          is_featured?: boolean
          product_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          badge: string | null
          body: string
          brand_id: string | null
          capacity_kw: number | null
          compare_at_price: number | null
          created_at: string
          critical_stock: number
          currency: string
          energy_class: string | null
          featured: boolean
          featured_image_path: string | null
          id: string
          is_active: boolean
          price: number | null
          price_mode: Database["public"]["Enums"]["price_mode"]
          price_note: string | null
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          sku: string
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          stock_quantity: number
          stock_status: Database["public"]["Enums"]["stock_status"]
          summary: string
          tags: string[]
          title: string
          updated_at: string
          warranty_years: number | null
        }
        Insert: {
          badge?: string | null
          body?: string
          brand_id?: string | null
          capacity_kw?: number | null
          compare_at_price?: number | null
          created_at?: string
          critical_stock?: number
          currency?: string
          energy_class?: string | null
          featured?: boolean
          featured_image_path?: string | null
          id?: string
          is_active?: boolean
          price?: number | null
          price_mode?: Database["public"]["Enums"]["price_mode"]
          price_note?: string | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          sku: string
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          stock_quantity?: number
          stock_status?: Database["public"]["Enums"]["stock_status"]
          summary?: string
          tags?: string[]
          title: string
          updated_at?: string
          warranty_years?: number | null
        }
        Update: {
          badge?: string | null
          body?: string
          brand_id?: string | null
          capacity_kw?: number | null
          compare_at_price?: number | null
          created_at?: string
          critical_stock?: number
          currency?: string
          energy_class?: string | null
          featured?: boolean
          featured_image_path?: string | null
          id?: string
          is_active?: boolean
          price?: number | null
          price_mode?: Database["public"]["Enums"]["price_mode"]
          price_note?: string | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          sku?: string
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          stock_quantity?: number
          stock_status?: Database["public"]["Enums"]["stock_status"]
          summary?: string
          tags?: string[]
          title?: string
          updated_at?: string
          warranty_years?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      smtp_settings: {
        Row: {
          admin_notification_email: string
          created_at: string
          from_email: string
          from_name: string
          host: string
          id: string
          is_enabled: boolean
          password: string
          port: number
          reply_to: string
          secure: boolean
          updated_at: string
          username: string
        }
        Insert: {
          admin_notification_email?: string
          created_at?: string
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          is_enabled?: boolean
          password?: string
          port?: number
          reply_to?: string
          secure?: boolean
          updated_at?: string
          username?: string
        }
        Update: {
          admin_notification_email?: string
          created_at?: string
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          is_enabled?: boolean
          password?: string
          port?: number
          reply_to?: string
          secure?: boolean
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      customer_accounts: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          last_payment_at: string | null
          last_transaction_at: string | null
          overdue_balance: number
          payment_term_days: number
          risk_limit: number
          risk_policy: string
          risk_warning_threshold: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          last_payment_at?: string | null
          last_transaction_at?: string | null
          overdue_balance?: number
          payment_term_days?: number
          risk_limit?: number
          risk_policy?: string
          risk_warning_threshold?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          last_payment_at?: string | null
          last_transaction_at?: string | null
          overdue_balance?: number
          payment_term_days?: number
          risk_limit?: number
          risk_policy?: string
          risk_warning_threshold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_accounts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customer_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      account_transaction_due_dates: {
        Row: {
          actor_user_id: string | null
          created_at: string
          due_date: string
          id: string
          reason: string
          transaction_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          due_date: string
          id?: string
          reason?: string
          transaction_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          due_date?: string
          id?: string
          reason?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_transaction_due_dates_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_transaction_due_dates_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "account_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      account_transactions: {
        Row: {
          actor_user_id: string | null
          amount: number
          balance_after: number
          created_at: string
          credit: number
          customer_id: string
          debit: number
          description: string
          due_date: string | null
          id: string
          idempotency_key: string | null
          is_reversal: boolean
          order_id: string | null
          payment_id: string | null
          reference: string
          reversed_transaction_id: string | null
          type: string
        }
        Insert: {
          actor_user_id?: string | null
          amount?: number
          balance_after?: number
          created_at?: string
          credit?: number
          customer_id: string
          debit?: number
          description?: string
          due_date?: string | null
          id?: string
          idempotency_key?: string | null
          is_reversal?: boolean
          order_id?: string | null
          payment_id?: string | null
          reference?: string
          reversed_transaction_id?: string | null
          type: string
        }
        Update: {
          actor_user_id?: string | null
          amount?: number
          balance_after?: string | null
          created_at?: string
          credit?: number
          customer_id?: string
          debit?: number
          description?: string
          due_date?: string | null
          id?: string
          idempotency_key?: string | null
          is_reversal?: boolean
          order_id?: string | null
          payment_id?: string | null
          reference?: string
          reversed_transaction_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "account_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_transactions_reversed_transaction_id_fkey"
            columns: ["reversed_transaction_id"]
            isOneToOne: false
            referencedRelation: "account_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          actor_user_id: string | null
          amount: number
          created_at: string
          customer_id: string
          description: string
          id: string
          idempotency_key: string | null
          note: string
          order_id: string | null
          paid_at: string
          payment_method: string
          provider: string
          provider_reference: string | null
          reference_number: string
          status: string
        }
        Insert: {
          actor_user_id?: string | null
          amount?: number
          created_at?: string
          customer_id: string
          description?: string
          id?: string
          idempotency_key?: string | null
          note?: string
          order_id?: string | null
          paid_at?: string
          payment_method?: string
          provider?: string
          provider_reference?: string | null
          reference_number?: string
          status?: string
        }
        Update: {
          actor_user_id?: string | null
          amount?: number
          created_at?: string
          customer_id?: string
          description?: string
          id?: string
          idempotency_key?: string | null
          note?: string
          order_id?: string | null
          paid_at?: string
          payment_method?: string
          provider?: string
          provider_reference?: string | null
          reference_number?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          allocated_amount: number
          created_at: string
          id: string
          order_id: string
          payment_id: string
        }
        Insert: {
          allocated_amount?: number
          created_at?: string
          id?: string
          order_id: string
          payment_id: string
        }
        Update: {
          allocated_amount?: number
          created_at?: string
          id?: string
          order_id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          actor_user_id: string | null
          created_at: string
          id: string
          idempotency_key: string | null
          order_id: string | null
          previous_quantity: number
          product_id: string
          quantity_change: number
          reference: string
          resulting_quantity: number
          type: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          order_id?: string | null
          previous_quantity?: number
          product_id: string
          quantity_change?: number
          reference?: string
          resulting_quantity?: number
          type?: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          order_id?: string | null
          previous_quantity?: number
          product_id?: string
          quantity_change?: number
          reference?: string
          resulting_quantity?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string
          id: string
          ip_address: string
          metadata: Json
          new_value: Json
          old_value: Json
          resource_id: string
          resource_type: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string
          id?: string
          ip_address?: string
          metadata?: Json
          new_value?: Json
          old_value?: Json
          resource_id?: string
          resource_type: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string
          id?: string
          ip_address?: string
          metadata?: Json
          new_value?: Json
          old_value?: Json
          resource_id?: string
          resource_type?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          link: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sms_templates: {
        Row: {
          body: string
          created_at: string
          is_enabled: boolean
          key: string
          name: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          is_enabled?: boolean
          key: string
          name: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          is_enabled?: boolean
          key?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      refund_transactions: {
        Row: { amount: number; created_at: string; currency: string; error_message: string; id: string; idempotency_key: string; metadata: Json; order_credit_transaction_id: string | null; payment_attempt_id: string | null; payout_debit_transaction_id: string | null; processed_at: string | null; provider: Database["public"]["Enums"]["payment_provider"]; provider_reference: string | null; return_request_id: string; status: string; updated_at: string }
        Insert: { amount: number; created_at?: string; currency?: string; error_message?: string; id?: string; idempotency_key: string; metadata?: Json; order_credit_transaction_id?: string | null; payment_attempt_id?: string | null; payout_debit_transaction_id?: string | null; processed_at?: string | null; provider?: Database["public"]["Enums"]["payment_provider"]; provider_reference?: string | null; return_request_id: string; status?: string; updated_at?: string }
        Update: { amount?: number; created_at?: string; currency?: string; error_message?: string; id?: string; idempotency_key?: string; metadata?: Json; order_credit_transaction_id?: string | null; payment_attempt_id?: string | null; payout_debit_transaction_id?: string | null; processed_at?: string | null; provider?: Database["public"]["Enums"]["payment_provider"]; provider_reference?: string | null; return_request_id?: string; status?: string; updated_at?: string }
        Relationships: []
      }
      return_items: {
        Row: { created_at: string; id: string; order_item_id: string; product_id: string | null; quantity: number; refund_amount: number; restocked_at: string | null; return_request_id: string }
        Insert: { created_at?: string; id?: string; order_item_id: string; product_id?: string | null; quantity: number; refund_amount: number; restocked_at?: string | null; return_request_id: string }
        Update: { created_at?: string; id?: string; order_item_id?: string; product_id?: string | null; quantity?: number; refund_amount?: number; restocked_at?: string | null; return_request_id?: string }
        Relationships: []
      }
      return_requests: {
        Row: { admin_note: string; approved_at: string | null; completed_at: string | null; created_at: string; customer_note: string; id: string; order_id: string; payment_attempt_id: string | null; reason: string; received_at: string | null; refunded_at: string | null; rejected_at: string | null; requested_at: string; return_number: string; status: string; total_refund_amount: number; updated_at: string; user_id: string }
        Insert: { admin_note?: string; approved_at?: string | null; completed_at?: string | null; created_at?: string; customer_note?: string; id?: string; order_id: string; payment_attempt_id?: string | null; reason: string; received_at?: string | null; refunded_at?: string | null; rejected_at?: string | null; requested_at?: string; return_number: string; status?: string; total_refund_amount?: number; updated_at?: string; user_id: string }
        Update: { admin_note?: string; approved_at?: string | null; completed_at?: string | null; created_at?: string; customer_note?: string; id?: string; order_id?: string; payment_attempt_id?: string | null; reason?: string; received_at?: string | null; refunded_at?: string | null; rejected_at?: string | null; requested_at?: string; return_number?: string; status?: string; total_refund_amount?: number; updated_at?: string; user_id?: string }
        Relationships: []
      }
      return_status_history: {
        Row: { actor_user_id: string | null; created_at: string; from_status: string | null; id: string; note: string; return_request_id: string; to_status: string }
        Insert: { actor_user_id?: string | null; created_at?: string; from_status?: string | null; id?: string; note?: string; return_request_id: string; to_status: string }
        Update: { actor_user_id?: string | null; created_at?: string; from_status?: string | null; id?: string; note?: string; return_request_id?: string; to_status?: string }
        Relationships: []
      }
      invoice_items: {
        Row: { created_at: string; discount_amount: number; gross_amount: number; id: string; invoice_id: string; line_total: number; order_item_id: string | null; product_id: string | null; product_sku: string; product_title: string; quantity: number; tax_amount: number; tax_rate: number; unit_price: number }
        Insert: { created_at?: string; discount_amount?: number; gross_amount: number; id?: string; invoice_id: string; line_total: number; order_item_id?: string | null; product_id?: string | null; product_sku?: string; product_title: string; quantity: number; tax_amount?: number; tax_rate?: number; unit_price: number }
        Update: { created_at?: string; discount_amount?: number; gross_amount?: number; id?: string; invoice_id?: string; line_total?: number; order_item_id?: string | null; product_id?: string | null; product_sku?: string; product_title?: string; quantity?: number; tax_amount?: number; tax_rate?: number; unit_price?: number }
        Relationships: [
          { foreignKeyName: "invoice_items_invoice_id_fkey"; columns: ["invoice_id"]; isOneToOne: false; referencedRelation: "invoices"; referencedColumns: ["id"] },
          { foreignKeyName: "invoice_items_order_item_id_fkey"; columns: ["order_item_id"]; isOneToOne: false; referencedRelation: "order_items"; referencedColumns: ["id"] },
          { foreignKeyName: "invoice_items_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] },
        ]
      }
      invoice_number_counters: {
        Row: { document_type: string; document_year: number; last_number: number; updated_at: string }
        Insert: { document_type: string; document_year: number; last_number?: number; updated_at?: string }
        Update: { document_type?: string; document_year?: number; last_number?: number; updated_at?: string }
        Relationships: []
      }
      invoice_provider_attempts: {
        Row: { action: string; actor_user_id: string | null; created_at: string; id: string; invoice_id: string; provider: string; provider_reference: string | null; safe_message: string; status: string }
        Insert: { action: string; actor_user_id?: string | null; created_at?: string; id?: string; invoice_id: string; provider?: string; provider_reference?: string | null; safe_message?: string; status: string }
        Update: { action?: string; actor_user_id?: string | null; created_at?: string; id?: string; invoice_id?: string; provider?: string; provider_reference?: string | null; safe_message?: string; status?: string }
        Relationships: [{ foreignKeyName: "invoice_provider_attempts_invoice_id_fkey"; columns: ["invoice_id"]; isOneToOne: false; referencedRelation: "invoices"; referencedColumns: ["id"] }]
      }
      invoices: {
        Row: { billing_address: Json; cancelled_at: string | null; company_snapshot: Json; created_at: string; created_by: string | null; currency: string; customer_email: string; customer_name: string; customer_phone: string; customer_tax_number: string; customer_tax_office: string; discount_total: number; document_type: string; due_date: string | null; id: string; invoice_number: string; issued_at: string; note: string; order_id: string; parent_invoice_id: string | null; provider_error: string; provider_reference: string | null; provider_status: string; return_request_id: string | null; shipping_total: number; status: string; subtotal: number; tax_included: boolean; tax_rate: number; tax_total: number; total: number; updated_at: string; user_id: string }
        Insert: { billing_address?: Json; cancelled_at?: string | null; company_snapshot?: Json; created_at?: string; created_by?: string | null; currency?: string; customer_email?: string; customer_name: string; customer_phone?: string; customer_tax_number?: string; customer_tax_office?: string; discount_total?: number; document_type?: string; due_date?: string | null; id?: string; invoice_number: string; issued_at?: string; note?: string; order_id: string; parent_invoice_id?: string | null; provider_error?: string; provider_reference?: string | null; provider_status?: string; return_request_id?: string | null; shipping_total?: number; status?: string; subtotal: number; tax_included?: boolean; tax_rate?: number; tax_total?: number; total: number; updated_at?: string; user_id: string }
        Update: { billing_address?: Json; cancelled_at?: string | null; company_snapshot?: Json; created_at?: string; created_by?: string | null; currency?: string; customer_email?: string; customer_name?: string; customer_phone?: string; customer_tax_number?: string; customer_tax_office?: string; discount_total?: number; document_type?: string; due_date?: string | null; id?: string; invoice_number?: string; issued_at?: string; note?: string; order_id?: string; parent_invoice_id?: string | null; provider_error?: string; provider_reference?: string | null; provider_status?: string; return_request_id?: string | null; shipping_total?: number; status?: string; subtotal?: number; tax_included?: boolean; tax_rate?: number; tax_total?: number; total?: number; updated_at?: string; user_id?: string }
        Relationships: [
          { foreignKeyName: "invoices_order_id_fkey"; columns: ["order_id"]; isOneToOne: false; referencedRelation: "orders"; referencedColumns: ["id"] },
          { foreignKeyName: "invoices_parent_invoice_id_fkey"; columns: ["parent_invoice_id"]; isOneToOne: false; referencedRelation: "invoices"; referencedColumns: ["id"] },
          { foreignKeyName: "invoices_return_request_id_fkey"; columns: ["return_request_id"]; isOneToOne: false; referencedRelation: "return_requests"; referencedColumns: ["id"] },
        ]
      }
      shipment_items: {
        Row: { created_at: string; id: string; order_item_id: string; quantity: number; shipment_id: string }
        Insert: { created_at?: string; id?: string; order_item_id: string; quantity: number; shipment_id: string }
        Update: { created_at?: string; id?: string; order_item_id?: string; quantity?: number; shipment_id?: string }
        Relationships: [
          { foreignKeyName: "shipment_items_order_item_id_fkey"; columns: ["order_item_id"]; isOneToOne: false; referencedRelation: "order_items"; referencedColumns: ["id"] },
          { foreignKeyName: "shipment_items_shipment_id_fkey"; columns: ["shipment_id"]; isOneToOne: false; referencedRelation: "shipments"; referencedColumns: ["id"] },
        ]
      }
      shipment_status_history: {
        Row: { actor_user_id: string | null; created_at: string; from_status: string | null; id: string; note: string; shipment_id: string; to_status: string }
        Insert: { actor_user_id?: string | null; created_at?: string; from_status?: string | null; id?: string; note?: string; shipment_id: string; to_status: string }
        Update: { actor_user_id?: string | null; created_at?: string; from_status?: string | null; id?: string; note?: string; shipment_id?: string; to_status?: string }
        Relationships: [{ foreignKeyName: "shipment_status_history_shipment_id_fkey"; columns: ["shipment_id"]; isOneToOne: false; referencedRelation: "shipments"; referencedColumns: ["id"] }]
      }
      shipments: {
        Row: { carrier: string; created_at: string; created_by: string | null; delivered_at: string | null; id: string; note: string; order_id: string; shipment_number: string; shipped_at: string | null; status: string; tracking_number: string; tracking_url: string | null; updated_at: string }
        Insert: { carrier?: string; created_at?: string; created_by?: string | null; delivered_at?: string | null; id?: string; note?: string; order_id: string; shipment_number: string; shipped_at?: string | null; status?: string; tracking_number?: string; tracking_url?: string | null; updated_at?: string }
        Update: { carrier?: string; created_at?: string; created_by?: string | null; delivered_at?: string | null; id?: string; note?: string; order_id?: string; shipment_number?: string; shipped_at?: string | null; status?: string; tracking_number?: string; tracking_url?: string | null; updated_at?: string }
        Relationships: [{ foreignKeyName: "shipments_order_id_fkey"; columns: ["order_id"]; isOneToOne: false; referencedRelation: "orders"; referencedColumns: ["id"] }]
      }
      sms_logs: {
        Row: {
          actor_user_id: string | null
          body: string
          created_at: string
          customer_id: string | null
          due_transaction_id: string | null
          error_message: string
          event_key: string | null
          event_type: string | null
          id: string
          metadata: Json
          recipient_phone: string
          status: string
          template_key: string | null
        }
        Insert: {
          actor_user_id?: string | null
          body?: string
          created_at?: string
          customer_id?: string | null
          due_transaction_id?: string | null
          error_message?: string
          event_key?: string | null
          event_type?: string | null
          id?: string
          metadata?: Json
          recipient_phone: string
          status?: string
          template_key?: string | null
        }
        Update: {
          actor_user_id?: string | null
          body?: string
          created_at?: string
          customer_id?: string | null
          due_transaction_id?: string | null
          error_message?: string
          event_key?: string | null
          event_type?: string | null
          id?: string
          metadata?: Json
          recipient_phone?: string
          status?: string
          template_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_template_key_fkey"
            columns: ["template_key"]
            isOneToOne: false
            referencedRelation: "sms_templates"
            referencedColumns: ["key"]
          },
        ]
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      xml_sources: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_message: string
          last_run_at: string | null
          last_status: string
          name: string
          price_markup: number
          schedule_minutes: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_message?: string
          last_run_at?: string | null
          last_status?: string
          name: string
          price_markup?: number
          schedule_minutes?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_message?: string
          last_run_at?: string | null
          last_status?: string
          name?: string
          price_markup?: number
          schedule_minutes?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      xml_field_mappings: {
        Row: {
          created_at: string
          id: string
          source_field: string
          target_field: string
          xml_source_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_field: string
          target_field: string
          xml_source_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source_field?: string
          target_field?: string
          xml_source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "xml_field_mappings_xml_source_id_fkey"
            columns: ["xml_source_id"]
            isOneToOne: false
            referencedRelation: "xml_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      xml_sync_runs: {
        Row: {
          created_at: string
          created_products: number
          error_message: string
          finished_at: string | null
          id: string
          started_at: string
          status: string
          total_products: number
          updated_products: number
          xml_source_id: string | null
        }
        Insert: {
          created_at?: string
          created_products?: number
          error_message?: string
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          total_products?: number
          updated_products?: number
          xml_source_id?: string | null
        }
        Update: {
          created_at?: string
          created_products?: number
          error_message?: string
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          total_products?: number
          updated_products?: number
          xml_source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xml_sync_runs_xml_source_id_fkey"
            columns: ["xml_source_id"]
            isOneToOne: false
            referencedRelation: "xml_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      xml_sync_errors: {
        Row: {
          created_at: string
          id: string
          message: string
          raw_data: string
          sku: string
          xml_sync_run_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string
          raw_data?: string
          sku?: string
          xml_sync_run_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          raw_data?: string
          sku?: string
          xml_sync_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xml_sync_errors_xml_sync_run_id_fkey"
            columns: ["xml_sync_run_id"]
            isOneToOne: false
            referencedRelation: "xml_sync_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_health_checks: {
        Row: {
          actor_user_id: string | null
          check_type: string
          checked_at: string
          environment: string
          id: string
          integration_key: string
          message: string
          metadata: Json
          status: string
        }
        Insert: {
          actor_user_id?: string | null
          check_type?: string
          checked_at?: string
          environment?: string
          id?: string
          integration_key: string
          message?: string
          metadata?: Json
          status: string
        }
        Update: {
          actor_user_id?: string | null
          check_type?: string
          checked_at?: string
          environment?: string
          id?: string
          integration_key?: string
          message?: string
          metadata?: Json
          status?: string
        }
        Relationships: []
      }
      netgsm_settings: {
        Row: {
          created_at: string
          header: string
          id: string
          is_enabled: boolean
          password: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          header?: string
          id?: string
          is_enabled?: boolean
          password?: string
          updated_at?: string
          username?: string
        }
        Update: {
          created_at?: string
          header?: string
          id?: string
          is_enabled?: boolean
          password?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      odeal_settings: {
        Row: {
          api_key: string
          created_at: string
          id: string
          is_enabled: boolean
          is_test_mode: boolean
          secret_key: string
          updated_at: string
        }
        Insert: {
          api_key?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          is_test_mode?: boolean
          secret_key?: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          is_test_mode?: boolean
          secret_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      price_lists: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      price_list_items: {
        Row: {
          created_at: string
          discount_percent: number | null
          id: string
          price: number | null
          price_list_id: string
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          discount_percent?: number | null
          id?: string
          price?: number | null
          price_list_id: string
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          discount_percent?: number | null
          id?: string
          price?: number | null
          price_list_id?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_list_items_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_list_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_price_lists: {
        Row: {
          created_at: string
          customer_id: string
          price_list_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          price_list_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          price_list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_price_lists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "customer_price_lists_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_product_prices: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          price: number
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          price: number
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          price?: number
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_product_prices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "customer_product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_discounts: {
        Row: {
          created_at: string
          customer_id: string
          discount_percent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          discount_percent?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          discount_percent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_discounts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          id: string
          is_system: boolean
          label: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_system?: boolean
          label: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_system?: boolean
          label?: string
          name?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          created_at: string
          description: string
          id: string
          key: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          key: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          key?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      customer_account_metrics: {
        Row: {
          customer_count: number | null
          total_customer_credit: number | null
          total_overdue: number | null
          total_receivable: number | null
        }
        Relationships: []
      }
      customer_account_summaries: {
        Row: {
          account_code: string | null
          account_id: string | null
          available_limit: number | null
          balance: number | null
          customer_id: string | null
          customer_name: string | null
          email: string | null
          is_active: boolean | null
          last_transaction_at: string | null
          overdue_balance: number | null
          phone: string | null
          risk_exceeded: boolean | null
          risk_limit: number | null
          search_text: string | null
          total_credit: number | null
          total_debit: number | null
        }
        Relationships: []
      }
      customer_risk_status: {
        Row: {
          account_id: string | null
          available_limit: number | null
          customer_id: string | null
          ledger_exposure: number | null
          risk_exceeded: boolean | null
          risk_limit: number | null
          risk_policy: string | null
          unposted_order_exposure: number | null
          usage_percent: number | null
          used_limit: number | null
          warning_threshold: number | null
        }
        Relationships: []
      }
      account_transaction_ledger: {
        Row: {
          actor_name: string | null
          actor_user_id: string | null
          balance_after: number | null
          created_at: string | null
          credit: number | null
          customer_id: string | null
          debit: number | null
          description: string | null
          due_date: string | null
          is_reversal: boolean | null
          order_id: string | null
          order_number: string | null
          payment_id: string | null
          reference: string | null
          reversed_transaction_id: string | null
          search_text: string | null
          transaction_id: string | null
          type: string | null
        }
        Relationships: []
      }
      customer_receivable_due_status: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          description: string | null
          due_date: string | null
          order_id: string | null
          order_number: string | null
          original_amount: number | null
          overdue_days: number | null
          paid_amount: number | null
          reference: string | null
          remaining_amount: number | null
          remaining_days: number | null
          status: string | null
          transaction_id: string | null
        }
        Relationships: []
      }
      customer_account_transaction_breakdown: {
        Row: {
          customer_id: string | null
          last_transaction_at: string | null
          net_balance: number | null
          total_credit: number | null
          total_debit: number | null
          transaction_count: number | null
          type: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_customer_address: {
        Args: { p_id: string }
        Returns: boolean
      }
      save_customer_address: {
        Args: {
          p_address_line: string
          p_city: string
          p_district: string
          p_full_name: string
          p_id: string | null
          p_is_default: boolean
          p_label: string
          p_neighborhood: string
          p_phone: string
          p_postal_code: string
        }
        Returns: string
      }
      set_default_customer_address: {
        Args: { p_id: string }
        Returns: boolean
      }
      create_invoice_adjustment: {
        Args: { p_actor_user_id?: string; p_document_type: string; p_invoice_id: string; p_note?: string; p_return_request_id?: string }
        Returns: { created_invoice_id: string; created_invoice_number: string; created_total: number }[]
      }
      create_order_invoice: {
        Args: { p_actor_user_id?: string; p_billing_address?: Json; p_company_snapshot?: Json; p_customer_tax_number?: string; p_customer_tax_office?: string; p_due_date?: string; p_note?: string; p_order_id: string; p_tax_rate?: number }
        Returns: { created_invoice_id: string; created_invoice_number: string; created_total: number }[]
      }
      create_order_shipment: {
        Args: { p_actor_user_id?: string; p_carrier?: string; p_items: Json; p_note?: string; p_order_id: string; p_tracking_number?: string; p_tracking_url?: string }
        Returns: { history_id: string; order_id: string; shipment_id: string; shipment_status: string }[]
      }
      create_return_request: {
        Args: { p_customer_note?: string; p_items: Json; p_order_id: string; p_reason: string }
        Returns: { return_number: string; return_request_id: string; total_refund_amount: number }[]
      }
      create_storefront_checkout: {
        Args: {
          p_billing_address: Json
          p_coupon_code?: string | null
          p_coupon_id?: string | null
          p_customer_email: string
          p_customer_name: string
          p_customer_phone: string
          p_discount_total?: number
          p_items: Json
          p_idempotency_key: string
          p_note: string
          p_payment_metadata?: Json
          p_payment_method_id: string
          p_shipping_address: Json
          p_user_id: string
        }
        Returns: {
          order_id: string
          order_number: string
          payment_attempt_id: string
        }[]
      }
      create_account_storefront_checkout: {
        Args: {
          p_billing_address: Json
          p_coupon_code?: string | null
          p_coupon_id?: string | null
          p_customer_email: string
          p_customer_name: string
          p_customer_phone: string
          p_discount_total?: number
          p_items: Json
          p_idempotency_key: string
          p_note: string
          p_payment_metadata?: Json
          p_payment_method_id: string
          p_shipping_address: Json
          p_user_id: string
        }
        Returns: {
          order_id: string
          order_number: string
          payment_attempt_id: string
        }[]
      }
      charge_checkout_to_account: {
        Args: { p_attempt_id: string; p_user_id: string }
        Returns: {
          accounting_action: string
          order_id: string
          order_number: string
          resulting_balance: number
        }[]
      }
      approve_order_risk: {
        Args: { p_actor_user_id: string; p_order_id: string }
        Returns: Database["public"]["Tables"]["orders"]["Row"]
      }
      evaluate_customer_risk: {
        Args: {
          p_customer_id: string
          p_order_id?: string | null
          p_proposed_amount?: number
        }
        Returns: {
          allowed: boolean
          available_limit: number
          decision: string
          ledger_exposure: number
          message: string
          projected_exposure: number
          proposed_amount: number
          requires_approval: boolean
          risk_limit: number
          risk_policy: string
          unposted_order_exposure: number
          usage_percent: number
          used_limit: number
          warning_threshold: number
        }[]
      }
      update_customer_risk_settings: {
        Args: {
          p_actor_user_id?: string | null
          p_customer_id: string
          p_risk_limit: number
          p_risk_policy: string
          p_warning_threshold: number
        }
        Returns: Database["public"]["Tables"]["customer_accounts"]["Row"]
      }
      append_account_transaction: {
        Args: {
          p_actor_user_id?: string | null
          p_credit: number
          p_customer_id: string
          p_debit: number
          p_description?: string
          p_due_date?: string | null
          p_idempotency_key?: string | null
          p_is_reversal?: boolean
          p_order_id?: string | null
          p_payment_id?: string | null
          p_reference?: string
          p_reversed_transaction_id?: string | null
          p_type: string
        }
        Returns: {
          idempotency_hit: boolean
          resulting_balance: number
          transaction_id: string
        }[]
      }
      cancel_order_with_accounting: {
        Args: {
          p_actor_user_id?: string | null
          p_order_id: string
        }
        Returns: {
          accounting_action: string
          customer_id: string
          resulting_balance: number
          transaction_id: string | null
        }[]
      }
      generate_order_number: { Args: never; Returns: string }
      is_customer_active: {
        Args: { check_user_id?: string }
        Returns: boolean
      }
      is_admin: { Args: { check_user_id?: string }; Returns: boolean }
      apply_stock_change: {
        Args: {
          p_actor_user_id?: string
          p_idempotency_key: string
          p_order_id?: string
          p_product_id: string
          p_quantity_change: number
          p_reference?: string
          p_type: string
        }
        Returns: {
          previous_quantity: number
          resulting_quantity: number
        }[]
      }
      record_payment_result_with_accounting: {
        Args: {
          p_attempt_id: string
          p_failure_reason: string | null
          p_metadata: Json
          p_paid: boolean
          p_provider_reference: string | null
        }
        Returns: {
          accounting_action: string
          customer_id: string
          order_id: string
          order_total: number
          resulting_balance: number
        }[]
      }
      next_invoice_number: { Args: { p_document_type: string; p_issued_at?: string }; Returns: string }
      record_account_payment: {
        Args: {
          p_actor_user_id?: string | null
          p_amount: number
          p_customer_id: string
          p_description?: string
          p_idempotency_key?: string | null
          p_note?: string
          p_order_id?: string | null
          p_paid_at?: string
          p_payment_method?: string
          p_provider?: string
          p_provider_reference?: string | null
          p_reference_number?: string
        }
        Returns: {
          allocated_amount: number
          customer_id: string
          idempotency_hit: boolean
          payment_id: string
          payment_type: string
          resulting_balance: number
          transaction_id: string
        }[]
      }
      set_account_transaction_due_date: {
        Args: {
          p_actor_user_id?: string | null
          p_due_date: string
          p_reason?: string
          p_transaction_id: string
        }
        Returns: {
          due_date: string
          transaction_id: string
        }[]
      }
      update_customer_payment_terms: {
        Args: {
          p_actor_user_id?: string | null
          p_customer_id: string
          p_payment_term_days: number
        }
        Returns: number
      }
      reverse_account_payment: {
        Args: {
          p_actor_user_id?: string | null
          p_payment_id: string
        }
        Returns: {
          customer_id: string
          idempotency_hit: boolean
          payment_id: string
          resulting_balance: number
          transaction_id: string
        }[]
      }
      sync_order_accounting: {
        Args: {
          p_actor_user_id?: string | null
          p_due_date?: string | null
          p_order_id: string
        }
        Returns: {
          accounting_action: string
          customer_id: string
          resulting_balance: number
          transaction_id: string | null
        }[]
      }
      finalize_return_refund: {
        Args: { p_actor_user_id?: string; p_error_message?: string; p_provider_reference?: string; p_refund_transaction_id: string; p_succeeded: boolean }
        Returns: { idempotency_hit: boolean; refund_status: string; refund_transaction_id: string; resulting_balance: number; return_request_id: string }[]
      }
      transition_return_request: {
        Args: { p_actor_user_id?: string; p_admin_note?: string; p_return_request_id: string; p_status: string }
        Returns: { current_status: string; previous_status: string; refund_transaction_id: string | null; return_request_id: string }[]
      }
      update_order_shipment: {
        Args: { p_actor_user_id?: string; p_carrier?: string; p_note?: string; p_shipment_id: string; p_status: string; p_tracking_number?: string; p_tracking_url?: string }
        Returns: { history_id: string; order_id: string; previous_status: string; shipment_id: string; shipment_status: string; status_changed: boolean }[]
      }
      update_order_with_accounting: {
        Args: {
          p_actor_user_id?: string | null
          p_admin_note: string
          p_note: string
          p_order_id: string
          p_payment_method_id: string | null
          p_payment_provider: Database["public"]["Enums"]["payment_provider"]
          p_payment_reference: string | null
          p_payment_status: Database["public"]["Enums"]["payment_status"]
          p_status: Database["public"]["Enums"]["order_status"]
        }
        Returns: {
          accounting_action: string
          customer_id: string
          order_id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          previous_payment_status: Database["public"]["Enums"]["payment_status"]
          previous_status: Database["public"]["Enums"]["order_status"]
          resulting_balance: number
          status: Database["public"]["Enums"]["order_status"]
        }[]
      }
    }
    Enums: {
      order_status:
        | "pending_payment"
        | "confirmed"
        | "preparing"
        | "shipped"
        | "completed"
        | "cancelled"
      payment_provider:
        | "offline"
        | "saved_card"
        | "iyzico"
        | "stripe"
        | "paytr"
        | "param"
        | "sipay"
        | "paycell"
        | "paynet"
        | "paratika"
        | "moka"
        | "craftgate"
        | "payu"
        | "shopier"
        | "papara"
        | "hepsipay"
        | "bank_pos"
        | "odeal"
        | "custom"
      payment_status: "unpaid" | "pending" | "paid" | "failed" | "refunded"
      price_mode: "fixed" | "contact"
      product_status: "draft" | "published" | "archived"
      stock_status: "in_stock" | "out_of_stock" | "on_request"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      order_status: [
        "pending_payment",
        "confirmed",
        "preparing",
        "shipped",
        "completed",
        "cancelled",
      ],
      payment_provider: [
        "offline",
        "saved_card",
        "iyzico",
        "stripe",
        "paytr",
        "param",
        "sipay",
        "paycell",
        "paynet",
        "paratika",
        "moka",
        "craftgate",
        "payu",
        "shopier",
        "papara",
        "hepsipay",
        "bank_pos",
        "odeal",
        "custom",
      ],
      payment_status: ["unpaid", "pending", "paid", "failed", "refunded"],
      price_mode: ["fixed", "contact"],
      product_status: ["draft", "published", "archived"],
      stock_status: ["in_stock", "out_of_stock", "on_request"],
    },
  },
} as const
