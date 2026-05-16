/**
 * PunchOut Protocol - Type Definitions
 * cXML-based e-commerce protocol for supplier catalogs
 */

/**
 * PunchOut session credentials
 */
export interface PunchOutSessionCredentials {
  id: string; // UUID
  org_id: string;
  vendor_id: string;
  username: string;
  password?: string; // Encrypted
  url: string; // PunchOut server URL
  protocol: "cxml" | "oauth"; // Protocol version
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

/**
 * PunchOut setup request (initial auth)
 */
export interface PunchOutSetupRequest {
  vendor_url: string;
  username: string;
  password: string;
  return_url: string; // URL to return cart to
}

/**
 * PunchOut cart item from supplier
 */
export interface PunchOutCartItem {
  supplier_sku: string;
  supplier_name: string;
  description: string;
  unit_price: number;
  currency: string;
  quantity: number;
  unit_of_measure: string;
  supplier_part_id?: string;
  manufacturer_name?: string;
  manufacturer_part_number?: string;
  uom_code?: string; // cXML UOM code
  lead_time?: string;
  comments?: string;
  manufacturer_url?: string;
}

/**
 * PunchOut profile (supplier catalog configuration)
 */
export interface PunchOutProfile {
  id: string; // UUID
  org_id: string;
  vendor_id: string;
  supplier_id: string; // Unique ID at supplier
  setup_credentials?: PunchOutSetupRequest;
  buyer_cookie?: string; // Session cookie from supplier
  last_session?: string;
  is_configured: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * PunchOut session state
 */
export interface PunchOutSession {
  id: string; // UUID
  profile_id: string;
  session_token: string;
  return_url: string;
  cart_items: PunchOutCartItem[];
  status: "active" | "completed" | "abandoned";
  started_at: string;
  completed_at?: string;
  created_at: string;
}

/**
 * cXML PunchOut request message
 */
export interface cXMLPunchOutRequest {
  timestamp: string; // ISO 8601
  payload_id: string;
  sender: {
    credential: {
      domain: string; // "DUNS" or "NetworkId"
      identity: string;
    };
  };
  request: {
    request_name: string; // "PunchOutSetupRequest" or "PunchOutOrderMessage"
    buyer_cookie?: string;
    browser_form_post?: {
      url: string;
    };
  };
}

/**
 * cXML PunchOut response message
 */
export interface cXMLPunchOutResponse {
  timestamp: string;
  payload_id: string;
  response: {
    response_status: {
      code: string; // "200" = success
      text: string;
    };
    punchout_setup_response?: {
      start_page: {
        url: string;
      };
      buyer_cookie?: string;
    };
  };
}

/**
 * PunchOut cart mapping to internal PO
 */
export interface PunchOutCartMapping {
  id: string; // UUID
  session_id: string;
  po_id?: string;
  vendor_id: string;
  cart_items: {
    supplier_sku: string;
    product_id?: string; // Internal product ID
    quantity: number;
    unit_price: number;
    line_notes?: string;
  }[];
  status: "pending" | "matched" | "converted";
  created_at: string;
  updated_at: string;
}

/**
 * Request to initiate PunchOut session
 */
export interface InitiatePunchOutRequest {
  vendor_id: string;
  return_url: string;
  buyer_cookie?: string;
}

/**
 * Response from PunchOut session
 */
export interface PunchOutSessionResponse {
  success: boolean;
  session_id: string;
  punchout_url: string;
  return_url: string;
  timestamp: string;
}

/**
 * PunchOut cart received from supplier
 */
export interface ReceivedPunchOutCart {
  session_id: string;
  timestamp: string;
  items: PunchOutCartItem[];
  total_amount?: number;
  currency?: string;
  buyer_cookie?: string;
  comments?: string;
}
