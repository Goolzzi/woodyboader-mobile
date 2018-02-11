import React from 'react';

import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ScrollView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
  Keyboard,
} from 'react-native';

import Expo from 'expo';
import Geocoder from 'react-native-geocoding';
Geocoder.setApiKey('AIzaSyBpWhmQmx1cXVJq9Oihx19rTJ9yfRAt9po');
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

import moment from 'moment';

import Toast from 'react-native-easy-toast';
import Collapsible from 'react-native-collapsible';
import KeyboardSpacer from 'react-native-keyboard-spacer';

import Colors from '../constants/Colors';

import Firebase from '../util/Firebase';

import InlineInputField from '../components/InlineInputField';
import MultilineInputField from '../components/MultilineInputField';
import LocationPicker from '../components/LocationPicker';
import DateTimePicker from 'react-native-modal-datetime-picker';


const DEFAULT_INITIAL_REGION = {
  latitude: 38.8998318,
  longitude: -77.14978889999999,
  latitudeDelta: (38.8998318-38.8722096),
  longitudeDelta: ((-77.14978889999999) - (-77.1948512)),
};

const { width, height } = Dimensions.get('window');

const mapWidth = width - 30;

class Button extends React.Component {
  render() {
    return (
      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={() => this.props.onPress()}>
          <View style={styles.button}>
            <Text style={styles.buttonText}>
              {this.props.text}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }
}

class CollapseButton extends React.Component {
  render() {
    return (
      <TouchableOpacity
        onPress={() => this.props.onPress()}
        style={this.props.style}>
        <View style={styles.buttonContentsContainer}>
          {this.props.iconName &&
            <MaterialIcons 
              name={this.props.iconName}
              size={24}
              color={this.props.iconColor}
            />
          }
          <Text style={this.props.textStyle}>
            {this.props.text}
          </Text>
          { this.props.showActivityIndicator &&
            <ActivityIndicator
              style={styles.activityIndicator}
              color={'#fff'}
            />
          }
        </View>
      </TouchableOpacity>
    );
  }
}

class CreateEventScreen extends React.Component {
  static navigationOptions = {
    gesturesEnabled: true,
    title: 'CREATE AN EVENT',
    headerTitleStyle: {
      color: Colors.tabIconSelected,
      fontFamily: 'CarterSansPro-Bold',
      fontSize: 18,
    },
    headerStyle: {
      marginTop: Platform.OS === 'ios' ? 0 : 20,
    }
  }

  state = {
    inputValues: {},
    userLocation: null,
    markerCoordinate: null,
    dateTimePickerVisible: false,
    initialRegion: null,
    mapCollapsed: true,
  }

  async componentWillMount() {
    const currentUser = await Firebase.getCurrentUser();

    if (currentUser.location) {
      const initialRegion = {
        latitude: currentUser.location.latitude,
        longitude: currentUser.location.longitude,
        latitudeDelta: 0.0230,
        longitudeDelta: 0.010525,
      };
      this.setState({ 
        userLocation: currentUser.location,
        initialRegion: initialRegion,
      });
    }
  }

  _onChangeText(field, text) {
    this.setState(prevState => {
      const inputValues = Object.assign({}, prevState.inputValues);
      if (field === 'location' && text === '') {
        if (prevState.inputValues.location.length !== 1) {
          return { inputValues: inputValues };
        }
      }

      inputValues[field] = text;

      return { inputValues: inputValues };
    });
  }

  _showDateTimePicker = () => {
    Keyboard.dismiss();
    this.setState({ dateTimePickerVisible: true });
  }

  _hideDateTimePicker = () => this.setState({ dateTimePickerVisible: false });

  _onDatePicked = (date) => {
    const dateString = moment(date).format('hA ddd MMM Do'); // e.g. 8pm Tue Aug 8th
    this._onChangeText('dateString', dateString);
    this._onChangeText('timestamp', date.getTime());
    this._hideDateTimePicker();
  }

  _onLocationEntered() {
    const { location } = this.state.inputValues;
    if (location == null || location === '') {
      return;
    }

    this._setMarkerLocationFromAddress(location);
  }

  _setMarkerLocationFromAddress(address) {
    Geocoder.getFromLocation(address).then(
      json => {
        const results = json.results[0];
        if (!results.geometry) {
          return;
        }
        const geometry = results.geometry;
        const coord = geometry.location;
        const markerCoord = {
          latitude: coord.lat,
          longitude: coord.lng,
        };
        this.setState({ markerCoordinate: markerCoord });
        let region = {
          ...markerCoord,
          latitudeDelta: 0.0230,
          longitudeDelta: 0.010525,
        };
        if (geometry.viewport) {
          region = this._regionFromViewport(geometry.viewport);
        }
        this._locationPicker.animateToRegion(region);
      },
      error => {
        console.log(error);
      },
    );
  }

  _regionFromViewport(viewport) {
    const ne = viewport.northeast;
    const sw = viewport.southwest;
    const region = {
      latitude: (ne.lat + sw.lat) / 2,
      longitude: (sw.lng + ne.lng) / 2,
      latitudeDelta: (ne.lat - sw.lat) * 1.05,
      longitudeDelta: (ne.lng - sw.lng) * 1.05,
    };
    return region;
  }

  _onMarkerDrag = (coordinate) => {
    this.setState({ markerCoordinate: coordinate });
    Geocoder.getFromLatLng(coordinate.latitude, coordinate.longitude).then(
      json => {
        const address = json.results[0].formatted_address;
        this._onChangeText('location', address);
      },
      error => {
        console.log(error);
      },
    );
  }

  async _submitEvent() {
    const eventData = this.state.inputValues;
    eventData.coordinate = this.state.markerCoordinate;
    const { title, location, dateString, description } = eventData;
    if (!(title && location && dateString)) {
      this.refs.toast.show('Title, location, and day/time are required', 5000);
      return;
    }
    await Firebase.createEvent(eventData);
    this.setState({ inputValues: {} });
    this.props.navigation.goBack();
  }

  _renderInnerContents() {
    const { initialRegion, mapCollapsed } = this.state;

    return (
      <ScrollView>
        <StatusBar hidden={false}/>
        <View style={styles.modal}>
          <Collapsible collapsed={mapCollapsed}>
            <LocationPicker
              mapStyle={styles.map}
              onChange={(e) => this._onMarkerDrag(e)}
              coordinate={this.state.markerCoordinate}
              initialRegion={initialRegion !== null ? initialRegion : DEFAULT_INITIAL_REGION}
              ref={picker => this._locationPicker = picker}
            />
          </Collapsible>
          <InlineInputField 
            label="TITLE"
            onChangeText={text => this._onChangeText('title', text)}
            value={this.state.inputValues.title}
          />
          <InlineInputField 
            label="LOCATION" 
            returnKeyType="done"
            onChangeText={text => this._onChangeText('location', text)}
            onSubmitEditing={(e) => {
              this._onLocationEntered();
            }}
            value={this.state.inputValues.location}
          />
          <TouchableOpacity 
            onPress={() => this._showDateTimePicker()}
            activeOpacity={1}>
            <View style={styles.inputFieldContainer}>
              <Text style={styles.inputFieldLabel}>
                {'DAY + TIME'}
              </Text>
              <View style={styles.inputField}>
                <Text style={styles.inputFieldText}>
                  {this.state.inputValues['dateString']}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          <MultilineInputField 
            label="DESCRIPTION" 
            onChangeText={text => this._onChangeText('description', text)}
            value={this.state.inputValues.description}
          />
        </View>
        <KeyboardSpacer />
      </ScrollView>
    );
  }

  render() {
    const { dateTimePickerVisible, mapCollapsed } = this.state;
    return (
      <View style={styles.container}>
        <View style={styles.contents}>      
          {this._renderInnerContents()}
        </View>
        <View style={{paddingTop: 10}}>
          <CollapseButton 
            style={styles.collapseButton}
            iconName={mapCollapsed ? 'add' : 'close'}
            iconColor={Colors.tabIconDefault}
            textStyle={styles.collapseButtonText}
            text={`${mapCollapsed ? 'SHOW' : 'HIDE'} MAP`}
            onPress={() => this.setState({ mapCollapsed: !mapCollapsed })}
          />
          <Button 
            text="SUBMIT" 
            onPress={() => this._submitEvent()}
          />
        </View>
        <DateTimePicker
          isVisible={dateTimePickerVisible}
          onConfirm={this._onDatePicked}
          onCancel={this._hideDateTimePicker}
          mode="datetime"
        />
        <Toast ref="toast" position="bottom"/>
      </View>
    );
  }
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  modal: {
    flex: 1,
    padding: 15,
    backgroundColor: '#fff',
  },
  map: {
    width: mapWidth,
    height: 250,
    alignSelf: 'center',
    marginVertical: 10,
  },
  contents: {
    flex: 1,
    // marginTop: 10,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'CarterSansPro-Bold',
  },
  button: {
    backgroundColor: Colors.tabIconSelected,
    marginVertical: 5,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
    width: width - 30,
    alignSelf: 'center',
  },
  inputFieldContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputFieldLabel: {
    fontFamily: 'Lato-Bold',
    color: Colors.tabIconDefault,
    fontSize: 11,
  },
  inputField: {
    backgroundColor: Colors.inactiveBackground,
    marginBottom: 7,
    paddingVertical: 8,
    paddingHorizontal: 30,
    width: 200,
  },
  inputFieldText: {
    textAlign: 'center',
    color: 'black',
    fontSize: 12,
    height: 15,
  },
  collapseButton: {
    flexDirection: 'row',
    width: width - 30,
    height: 44,
    backgroundColor: 'rgb(238, 238, 238)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  collapseButtonText: {
    fontFamily: 'CarterSansPro-Bold',
    fontSize: 14,
    color: 'rgb(142, 138, 127)', //Colors.tabIconDefault,
    paddingLeft: 5,
  },
  buttonContentsContainer: {
    flexDirection: 'row', 
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CreateEventScreen;
