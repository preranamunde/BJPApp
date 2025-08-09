// ApiService.js
const BASE_URL = 'https://your-api-base-url.com'; // Replace with your actual API base URL

// Set this to true for testing with mock data, false for real APIs
const USE_MOCK_DATA = true;

class ApiService {
  
  // Helper method for making API calls
  static async makeApiCall(endpoint) {
    try {
      const response = await fetch(`${BASE_URL}/${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': 'Bearer your-token'
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      return { success: false, error: error.message };
    }
  }

  // Updated mock data for testing
  static getMockData(endpoint) {
    const mockData = {
      'api/fetchMembercoordinates': {
        leader_coordinates: {
          title: "Dr.",
          member_name: "Sanjay Jaiswal",
          party: "Bhartiya Janta Party",
          constituency: "Paschim Champaran",
          state: "Bihar",
          email_id: "sanjay.jaiswal@gmail.com",
          digital_sansad_url: "https://digitalsansad.gov.in"
        }
      },
      'api/fetchSocialmedia': {
        social_media: {
          facebook: "www.facebook.com",
          twitter: "www.x.com",
          linkedin: "www.linkedin.com",
          instagram: "www.instagram.com"
        }
      },
      'api/fetchPersonaldetails': {
        personal_details: {
          birth_place: "Patna",
          dob: "12/08/1965",
          father_name: "Dr. Madan Prasad Jaiswal",
          mother_name: "Dr. Saroj Jaiswal",
          profession: "Politician"
        }
      },
      'api/fetchEducationaldetails': {
        edu_qual: [
          {
            degree: "MBBS",
            college: "PMCH",
            university: "Patna University",
            place: "Patna"
          },
          {
            degree: "MD",
            college: "PMCH",
            university: "Patna University",
            place: "Patna"
          }
        ]
      },
      'api/fetchAddresses': {
        addresses: {
          permanent: {
            address1: "Road No. 5",
            address2: "Ramna",
            address3: "Bettiah",
            pincode: "851223",
            state: "Bihar",
            isd_code: "+91",
            std_code: "0622",
            tel_number1: "2345672",
            mobile_number1: "8907896789",
            tel_number2: "2345672",
            mobile_number2: "8907896789"
          },
          present: {
            address1: "5 Talkatora Road",
            address2: "New Delhi",
            address3: null,
            pincode: "110001",
            state: "NCT of Delhi",
            isd_code: "+91",
            std_code: "011",
            tel_number1: "23456712",
            mobile_number1: "79078-96789",
            tel_number2: "23457221",
            mobile_number2: "9907896789"
          }
        }
      },
      'api/fetchTimeline': {
        timeline: [
          {
            date: "12/05/2024",
            title_position: {
              title: "Member of Lok Sabha",
              details: "Elected to Lok Sabha during General Election 2024"
            }
          },
          {
            date: "12/05/2024",
            title_position: {
              title: "Chairmain - Estimate Committee",
              details: "Finance Minsirty Advisory"
            }
          }
        ]
      }
    };

    return mockData[endpoint] || null;
  }

  // Use mock data if enabled
  static async makeApiCallWithMock(endpoint) {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const mockData = this.getMockData(endpoint);
      if (mockData) {
        console.log(`Using mock data for: ${endpoint}`);
        return { success: true, data: mockData };
      } else {
        console.log(`No mock data available for: ${endpoint}`);
        return { success: false, error: 'No mock data available' };
      }
    } else {
      return await this.makeApiCall(endpoint);
    }
  }

  // Profile Tab APIs
  static async fetchMemberCoordinates() {
    return await this.makeApiCallWithMock('api/fetchMembercoordinates');
  }

  static async fetchSocialMedia() {
    return await this.makeApiCallWithMock('api/fetchSocialmedia');
  }

  static async fetchPersonalDetails() {
    return await this.makeApiCallWithMock('api/fetchPersonaldetails');
  }

  static async fetchEducationalDetails() {
    return await this.makeApiCallWithMock('api/fetchEducationaldetails');
  }

  static async fetchAddresses() {
    return await this.makeApiCallWithMock('api/fetchAddresses');
  }

  // Timeline Tab API
  static async fetchTimeline() {
    return await this.makeApiCallWithMock('api/fetchTimeline');
  }

  // Fetch all profile data at once
  static async fetchAllProfileData() {
    try {
      const [
        memberCoordinates,
        socialMedia,
        personalDetails,
        educationalDetails,
        addresses
      ] = await Promise.all([
        this.fetchMemberCoordinates(),
        this.fetchSocialMedia(),
        this.fetchPersonalDetails(),
        this.fetchEducationalDetails(),
        this.fetchAddresses()
      ]);

      return {
        success: true,
        data: {
          memberCoordinates: memberCoordinates.success ? memberCoordinates.data : null,
          socialMedia: socialMedia.success ? socialMedia.data : null,
          personalDetails: personalDetails.success ? personalDetails.data : null,
          educationalDetails: educationalDetails.success ? educationalDetails.data : null,
          addresses: addresses.success ? addresses.data : null,
        },
        errors: {
          memberCoordinates: !memberCoordinates.success ? memberCoordinates.error : null,
          socialMedia: !socialMedia.success ? socialMedia.error : null,
          personalDetails: !personalDetails.success ? personalDetails.error : null,
          educationalDetails: !educationalDetails.success ? educationalDetails.error : null,
          addresses: !addresses.success ? addresses.error : null,
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch profile data',
        details: error.message
      };
    }
  }
}

export default ApiService;
