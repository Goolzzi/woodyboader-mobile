import React from 'react';

import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ScrollView,
  Image,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';

import Expo from 'expo';
import Toast from 'react-native-easy-toast';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import Collapsible from 'react-native-collapsible';


import Colors from '../constants/Colors';

import Firebase from '../util/Firebase';

import InlineInputField from '../components/InlineInputField';
import MultilineInputField from '../components/MultilineInputField';
import LocationPicker from '../components/LocationPicker';
import Geocoder from 'react-native-geocoding';

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
    title: 'RECOMMEND A PLACE',
    headerTitleStyle: {
      color: Colors.tabIconSelected,
      fontFamily: 'CarterSansPro-Bold',
      fontSize: 18,
    },
    headerStyle: {
      marginTop: Platform.OS === 'ios' ? 0 : 20,
    }
  }

  closeButton = (
    <Image
      source={require('../assets/images/X.png')}
      style={styles.closeButton}
    />
  );

  state = {
    inputValues: {},
    image: null,
    markerCoordinate: null,
    userLocation: null,
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
    const state = this.state.inputValues;
    state[field] = text;
    this.setState({ inputValues: state });
  }

  _pickImage = async () => {
    let result = await Expo.ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
    });

    if (!result.cancelled) {
      this.setState({ image: result.uri });
    }
  }

  _onMarkerDrag = (coordinate) => {
    this.setState({ markerCoordinate: coordinate });
    Geocoder.getFromLatLng(coordinate.latitude, coordinate.longitude).then(
      json => {
        const address = json.results[0].formatted_address;
        this._onChangeText('address', address);
      },
      error => {
        console.log(error);
      },
    );
  }

  async _submitRecommendation() {
    let { image } = this.state;
    const data = this.state.inputValues;
    const { title, category, description, address } = data;
    if (!(image && title && category && description && address)) {
      this.refs.toast.show('Error: All fields are required', 5000);
      return;
    }
    if (image) {
      await Firebase.addRecommendation(data, image);
    }
    this.setState({ image: null, inputValues: {} });
    this.props.navigation.goBack();
  }

  _renderInnerContents() {
    let { image, initialRegion, markerCoordinate, mapCollapsed } = this.state;
    return (
      <ScrollView contentContainerStyle={styles.scrollViewContainer}>
        {image &&
          <View style={styles.imageContentsContainer}>
            <Image source={{ uri: image }} style={styles.image} />
            <TouchableOpacity onPress={() => this.setState({ image: null })}>
              {this.closeButton}
            </TouchableOpacity>
          </View>
        }
        <InlineInputField
          label="TITLE"
          onChangeText={text => this._onChangeText('title', text)}
          value={this.state.inputValues.title}
        />
        <InlineInputField
          label="CATEGORY"
          onChangeText={text => this._onChangeText('category', text)}
          value={this.state.inputValues.category}
        />
        <InlineInputField
          label="ADDRESS"
          onChangeText={text => this._onChangeText('address', text)}
          value={this.state.inputValues.address}
        />
        <CollapseButton
          style={styles.collapseButton}
          iconName={mapCollapsed ? 'keyboard-arrow-right' : 'keyboard-arrow-down'}
          iconColor={Colors.tabIconDefault}
          textStyle={styles.collapseButtonText}
          text={`${mapCollapsed ? 'SHOW' : 'HIDE'} MAP`}
          onPress={() => this.setState({ mapCollapsed: !mapCollapsed })}
        />
        <Collapsible collapsed={mapCollapsed}>
          <LocationPicker
            mapStyle={styles.map}
            onChange={(e) => this._onMarkerDrag(e)}
            coordinate={markerCoordinate}
            initialRegion={initialRegion !== null ? initialRegion : DEFAULT_INITIAL_REGION}
          />
        </Collapsible>
        <InlineInputField
          label="WEBSITE"
          onChangeText={text => this._onChangeText('website', text)}
          value={this.state.inputValues.website}
        />
        <MultilineInputField
          label="DESCRIPTION"
          onChange={text => this._onChangeText('description', text)}
          value={this.state.inputValues.description}
        />
      </ScrollView>
    );
  }

  render() {
    let { image } = this.state;
    return (
      <View style={styles.container}>
        <View style={styles.contents}>
          <StatusBar hidden={false}/>
          {Platform.OS === 'ios' &&
            <KeyboardAvoidingView behavior="padding">
              {this._renderInnerContents()}
            </KeyboardAvoidingView>
          }
          {Platform.OS !== 'ios' &&
            this._renderInnerContents()
          }
        </View>
        <View style={{paddingTop: 10}}>
          <Button
            text="ADD AN IMAGE"
            onPress={this._pickImage}
          />
          <Button
            text="SUBMIT"
            onPress={() => this._submitRecommendation()}
          />
        </View>
        <Toast ref="toast" position="bottom" />
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
  scrollViewContainer: {
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  contents: {
    flex: 1,
    // marginTop: 10,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  map: {
    width: mapWidth,
    height: 250,
    alignSelf: 'center',
    marginBottom: 10,
  },
  imageContentsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    height: 196,
    width: 196,
    alignSelf:  'center',
    marginBottom: 10,
  },
  image: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  header: {
    color: Colors.tabIconSelected,
    fontFamily: 'CarterSansPro-Bold',
  },
  pageHeader: {
    fontSize: 18,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 12,
    color: '#fff',
    fontFamily: 'Lato-Bold',
  },
  button: {
    backgroundColor: Colors.tabIconSelected,
    paddingVertical: 10,
    alignItems: 'center',
    width: 200,
    marginBottom: 5,
  },
  closeButton: {
    width: 16,
    height: 16,
    margin: 3,
  },
  collapseButton: {
    flexDirection: 'row',
    width: width * .6,
    height: 44,
    marginBottom: 7,
    backgroundColor: 'rgb(238, 238, 238)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    alignSelf: 'center',
  },
  collapseButtonText: {
    fontFamily: 'CarterSansPro-Bold',
    fontSize: 16,
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
