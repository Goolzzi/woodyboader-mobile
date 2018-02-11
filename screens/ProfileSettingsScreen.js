import React from 'react';
import { 
  Button, 
  StyleSheet, 
  Platform,
  View,
  Text,
  TextInput,
  Modal,
  TouchableHighlight,
  TouchableOpacity,
  Image,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';

import Expo from 'expo';

import Images from '../util/Images';
import InlineInputField from '../components/InlineInputField';
import MultilineInputField from '../components/MultilineInputField';
import InlineToggle from '../components/InlineToggle';
import BoatCarousel from '../components/BoatCarousel';

import Colors from '../constants/Colors';
import DefaultNavOptions from '../constants/DefaultNavigationOptions';

import * as firebase from 'firebase';
import Firebase from '../util/Firebase';
import Storage from '../util/Storage';

class ProfileSettingsScreen extends React.Component {
  static navigationOptions = {
    gesturesEnabled: true,
    title: 'PROFILE SETTINGS',
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
    emailVerified: false,
    inputValues: {},
    user: null,
  };

  fieldLabels = [
    'email',
    'name',
    'phone',
    'city',
    'state',
    'bio',
  ];

  toggleLabels = [
    'useExactLocation',
    'nearbyNotifications',
    'showOnMap',
    'showContactInfo',
  ];

  constructor(props) {
    super(props);
    this.signOut = this.signOut.bind(this);
  }

  _inputField(label, fieldLabel, extraProps) {
    return (
      <InlineInputField
        label={label}
        onChangeText={text => this._onTextInput(fieldLabel, text)}
        value={this.state.inputValues[fieldLabel]}
        {...extraProps}
      />
    );
  }

  _onTogglePress(field, value) {
    const state = this.state.inputValues;
    let newValue = value;
    if (value === null || value === undefined) {
      newValue = !state[field];
    }
    state[field] = newValue;
    this.setState({ inputValues: state });
  }

  _onTextInput(field, text) {
    const state = this.state.inputValues;
    state[field] = text;
    this.setState({ inputValues: state });
  }

  _submitChanges() {
    const inputValues = this.state.inputValues;
    const userId = Firebase.getAuthenticatedUser().uid;
    Firebase.updateUserData(userId, inputValues);
  }

  componentDidMount() {
    firebase.auth().onAuthStateChanged(async user => {
      if (user) {
        if (user.emailVerified) {
          this.setState({ emailVerified: true });
        }

        // Populate fields with the user's known settings
        const userData = await Firebase.getCurrentUser();
        for (const fieldLabel in userData) {
          if (this.fieldLabels.includes(fieldLabel)) {
            this._onTextInput(fieldLabel, userData[fieldLabel]);
          }
          if (this.toggleLabels.includes(fieldLabel)) {
            this._onTogglePress(fieldLabel, userData[fieldLabel]);
          }
        }
        this.setState({ user: userData });
      }
    });
  }

  async verifyEmail() {
    const user = await Firebase.getAuthenticatedUser();
    if (!user.emailVerified) {
      user.sendEmailVerification().catch(error => console.log(error));
    }
  }

  signOut() {
    const { navigation } = this.props;
    firebase.auth().signOut().then(() => {
      navigation.navigate('Login');
    }).catch(error => {
      console.log(error);
    });
  }

  render() {
    return (
      <ScrollView>
      <KeyboardAvoidingView behavior={'position'} style={{ flex: 1 }}>
        <StatusBar hidden={false}/>
        <View style={styles.container}>
          <Text style={[styles.header, styles.sectionHeader]}>
            ACCOUNT DETAILS
          </Text>
          {this._inputField('NAME', 'name')}
          {this._inputField(
            'EMAIL', 
            'email', 
            { keyboardType: 'email-address'}
          )}
          {this._inputField(
            'PHONE', 
            'phone',
            { keyboardType: 'phone-pad'}
          )}
          {/*this._inputField(
            'PASSWORD*', 
            'password', 
            { 
              secureTextEntry: true 
            }
          )*/}
          {/*this._inputField(
            'CONFIRM PASSWORD*', 
            'passwordConfirm', 
            { 
              secureTextEntry: true 
            }
          )*/}
          <MultilineInputField 
            label="BIO"
            onChange={this._onTextInput.bind(this, 'bio')}
            value={this.state.inputValues['bio']}
          />
          <Text style={[styles.header, styles.sectionHeader]}>
            LOCATION
          </Text>
          {this._inputField('CITY', 'city')}
          {this._inputField('STATE', 'state')}
          <InlineToggle 
            label="USE MY EXACT LOCATION"
            value={this.state.inputValues['useExactLocation']}
            onChange={() => this._onTogglePress('useExactLocation')}
          />
          <Text style={[styles.header, styles.sectionHeader]}>
            SETTINGS
          </Text>
          {/*<InlineToggle 
            label="NEARBY NOTIFICATIONS" 
            value={this.state.inputValues['nearbyNotifications']}
            onChange={() => this._onTogglePress('nearbyNotifications')}
          />*/}
          <InlineToggle 
            label="SHOW ME ON THE MAP" 
            value={this.state.inputValues['showOnMap']}
            onChange={() => this._onTogglePress('showOnMap')}
          />
          <InlineToggle 
            label="SHOW MY CONTACT INFO" 
            value={this.state.inputValues['showContactInfo']}
            onChange={() => this._onTogglePress('showContactInfo')}
          />
          <TouchableOpacity onPress={() => this._submitChanges()}>
            <View style={styles.submitButton}>
              <Text style={styles.submitButtonText}>
                SUBMIT CHANGES
              </Text>
            </View>
          </TouchableOpacity>
          { !this.state.emailVerified && 
            <TouchableOpacity onPress={() => this.verifyEmail()}>
              <View style={styles.submitButton}>
                <Text style={styles.submitButtonText}>
                  "VERIFY EMAIL ADDRESS"
                </Text>
              </View>
            </TouchableOpacity>
          }
          <TouchableOpacity onPress={() => this.signOut()}>
            <View style={styles.submitButton}>
              <Text style={styles.submitButtonText}>
                SIGN OUT
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    marginTop: Platform.OS === 'ios' ? 10 : 0,
    padding: 15,
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    color: Colors.tabIconSelected,
    fontFamily: 'CarterSansPro-Bold',    
  },
  pageHeader: {
    fontSize: 18,
    marginBottom: 10,
    padding: 10,
  },
  sectionHeader: {
    fontSize: 12,
  },
  submitButton: {
    backgroundColor: Colors.tabIconSelected,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 30,
    alignItems: 'center',
    alignSelf: 'center',
    width: 250,
  },
  submitButtonText: {
    fontSize: 12,
    color: '#fff',
    fontFamily: 'Lato-Bold',
  },
});

export default ProfileSettingsScreen;