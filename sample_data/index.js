const Boaters = [
  {
    name: 'Matt Smith',
    username: '001',
    location_city_state: 'Falls Church, VA',
    location_lat_lng: {
      latitude: 38.884584, 
      longitude: -77.164129,
    },
    contact: {
      email: 'matt@wb.com',
      phone: '(000) 000-0000',
    },
    boats: {
      a: {
        name: 'Boat Name',
        make: 'Donzi',
        model: 'Sweet 16',
        year: 1776,
        image: '../assets/images/Woody_boat.jpg',
      },
      b: {
        name: 'boatB',
        make: 'Make',
        model: 'Model',
        year: 1994,
      },
    },
    bio: 'Wooden boat fanatic',
  },
  {
    name: 'Tom Hanks',
    username: '002',
    location_city_state: 'Los Angeles, CA',
    location_lat_lng: {
      latitude: 38.894584,
      longitude: -77.174129,
    },
    // contact: {
    //   email: 'tom@hanks.com',
    //   phone: '(123) 456-7890',
    // },
    boats: {
      a: {
        name: 'Wave Rider',
        make: 'Donzi',
        model: 'Sweet 16',
        year: 1776,
        image: '../assets/images/Woody_boat2.jpg',
      },
      b: {
        name: 'boatB',
        make: 'Make',
        model: 'Model',
        year: 1994,
      },
    },
    bio: 'I love the smell of varnish in the morning',
  },
];

export { Boaters as default };